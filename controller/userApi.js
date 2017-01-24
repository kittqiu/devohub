'use strict';

// user api

var
	_ = require('lodash'),
	thunkify = require('thunkify'),
	json_schema = require( __base +'lib/json_schema'),
	db = require(__base +'lib/db'), 
	config = require(__base +'lib/config'),
	constants = require(__base +'lib/constants'),
	auth = require(__base +'lib/auth'),
	api = require(__base +'lib/api'),
	i18n = require(__base +'lib/i18n'),
	log = require(__base +'lib/logger'),
	smtp = require('./system/email'),
	swig = require('swig'),
	requestIp = require('request-ip'),
	home = require('./home');

var 
	User = db.user,
	LocalUser = db.localuser,
	EmailAuth = db.email_auth,
	warp = db.warp,
	next_id = db.next_id;

var 
	COOKIE_NAME = config.session.cookie,
	LOCAL_SIGNIN_EXPIRES_IN_MS = 1000 * config.session.expires,
	DEFAULT_EXPIRES_IN_MS = LOCAL_SIGNIN_EXPIRES_IN_MS;

function* $getUserByEmail(email) {
	return yield User.$find({
		where: '`email`=?',
		params: [email],
		limit: 1
	});
}

function* $getUserByName(name) {
	return yield User.$find({
		where: '`username`=?',
		params: [name],
		limit: 1
	});
}

function getReferer(request) {
	var url = request.get('referer') || '/';
	if (url.indexOf('/auth/') >= 0 || url.indexOf('/manage/') >= 0) {
		url = '/';
	}
	return url;
}

function _makeSessionCooike(localuser, cookies){
	// make session cookie:
	var 
		expires = Date.now() + LOCAL_SIGNIN_EXPIRES_IN_MS,
		cookieStr = auth.makeSessionCookie(constants.signin.LOCAL, localuser.id, localuser.passwd, expires);
		cookies.set( COOKIE_NAME, cookieStr, {
		path: '/',
		httpOnly: true,
		expires: new Date(expires)
	});
}

function _genEmailConfirm( context, user, verify){
	var request = context.request,
		origin = 'http://' + (config.ip||config.domain)  /*+ (config.port===80?'': ':' + config.port)*/,
		model = {
			ip: requestIp.getClientIp(context.request),
			system: config.name,
			username: user.username,
			confirmurl: origin + '/auth/ConfirmEmail/' + verify.id, 
			cancelurl: origin + '/auth/CancelEmail/' + verify.id,
			deadline: verify.expired
		},
		renderHtml = swig.renderFile( __dirname + '/../view/system/confirmemail.html', model );
	smtp.sendHtml(null, user.email, context.translate('Confirm email'), renderHtml );
}

function setHistoryUrl( context, url ){
	if( arguments.length === 1){
		url = context.request.url;
	}
	context.cookies.set( 'SYSTEM_HISTORYURL', url, {
		path: '/',
		httpOnly: true,
		expires: new Date(Date.now()+DEFAULT_EXPIRES_IN_MS)
	});
}

function getHistoryUrl( context ){
	var url = context.cookies.get('SYSTEM_HISTORYURL');
	return url || '/';
}

function* $render( context, model, view ){
	context.render( 'system/' + view, yield home.$getModel.apply(context, [model]) );
}

/*
GET:
/auth/CancelEmail/:id
/auth/ConfirmEmail/:id
/auth/ConfirmEmail
/auth/signout

/api/user/:id

POST:
/api/authenticate
/api/auth/ConfirmEmail
/api/signup
/api/user/changepwd
/api/user/:id
/api/user/:id/status?actived=true
*/

module.exports = {
	'POST /api/signup': function* (){
		var 
			user,
			localuser,
			email, 
			name, 
			username, 
			password,
			verify, 
			data = this.request.body,
			email_suffix = config.security.email_suffix;

		//validate data
		json_schema.validate('createAccount', data);

		email = data.email;
		password = data.password;
		username = data.username;
		name = data.name;

		user = yield $getUserByEmail(email);
		if (user !== null) {
			throw api.conflictError('email', this.translate('Email has been signed up by another user.'));
		}
		user = yield $getUserByName(username);
		if (user !== null) {
			throw api.conflictError('username', this.translate('User name has been signed up by another user.'));
		}

		if( email_suffix ){
			if( !email.endsWith(email_suffix)){
				throw api.invalidParam( 'email', 'Email must be end with ' + email_suffix );
			}
		}

		//create account
		user = {
			id: next_id(),
			role: constants.role.DEVELOPER,
			username: username,
			name: name,
			email: email,
			image_url: '/static/img/user.png'
		};
		localuser = {
			user_id: user.id,
			passwd: auth.generatePassword(email, password)
		};
		verify = {
			id: next_id(),
			user_id: user.id,
			expired: Date.now() + 24 * 3600000
		};
		yield User.$create(user);
		yield LocalUser.$create(localuser);        
		yield EmailAuth.$create(verify);
		_genEmailConfirm( this, user, verify );        

		this.body = {
			id: user.id
		};
	},

	'POST /api/authenticate': function* () {
		/**
		 * Authenticate user by email or user name and password, for local user only.
		 * 
		 * @param {string} username: user name or Email address, in lower case.
		 * @param {string} passwd: The password, 40-chars SHA1 string, in lower case.
		 */
		var
			username,
			email, 
			passwd,
			user,
			localuser,
			data = this.request.body;
		json_schema.validate('authenticate', data);

		email = username = data.username;
		passwd = data.password;
		user = yield $getUserByName(username);
		if( user === null ){
			user = yield $getUserByEmail(email);
		}
		if (user === null) {
			throw api.authFailed('username', this.translate('User name or password invalid'));
		}
		if (user.locked_until > Date.now()) {
			throw api.authFailed('locked', this.translate('User is locked.'));
		}
		if( !user.verified ){
			throw api.authFailed('Unverified', this.translate('Please verify your email first.'));
		}
		if( !user.actived ){
			throw api.authFailed('Unactived', this.translate('User has been forbidden.'));
		}

		//reset 
		email = user.email;
		username = user.username;

		localuser = yield LocalUser.$find({
			where:'`user_id`=?',
			params: [user.id]
		})
		if( localuser === null ){
			throw api.authFailed('password', this.translate('User name or password invalid'));
		}

		//check password
		if(!auth.verifyPassword(email, passwd, localuser.passwd )){
			throw api.authFailed('password', this.translate('User name or password invalid'));
		}

		// make session cookie:
		var 
			expires = Date.now() + LOCAL_SIGNIN_EXPIRES_IN_MS,
			cookieStr = auth.makeSessionCookie(constants.signin.LOCAL, localuser.id, localuser.passwd, expires);
		this.cookies.set( COOKIE_NAME, cookieStr, {
			path: '/',
			httpOnly: true,
			expires: new Date(expires)
		});
		log.debug('set session cookie for user: ' + user.email);
		this.body = { result: 'ok', redirect:getHistoryUrl(this) }        
	},

	'GET /auth/CancelEmail/:id': function*(id){
		var user, localuser
			v = yield EmailAuth.$find(id);
		if( v === null ){
			throw api.authFailed('unknown', this.translate('Please verify your email first.'));
		}
		if( Date.now() > v.expired ){
			yield v.$destroy();
			this.body = "Verify expired";
			return;
		}
		
		user = yield User.$find( v.user_id );
		if( user === null ){
			throw api.authFailed('unknown', this.translate('User not found.'));
		}
		localuser = yield LocalUser.$find({
			where:'`user_id`=?',
			params: [user.id]
		})
		if( localuser === null ){
			throw api.authFailed('unknown', this.translate('User not found.'));
		}
		yield v.$destroy();
		yield user.$destroy();
		yield localuser.$destroy();

		this.body = 'Email Confirm has been cancel.'
	},

	'GET /auth/ConfirmEmail/:id': function*(id){
		var user,
			v = yield EmailAuth.$find(id);
		if( v === null ){
			throw api.authFailed('unknown', this.translate('Please verify your email first.'));
		}
		user = yield User.$find( v.user_id );
		if( user === null ){
			throw api.authFailed('unknown', this.translate('User not found.'));
		}
		if( Date.now() > v.expired ){
			yield v.$destroy();
			this.body = "Verify expired";
			return;
		}
		if( !user.verified ){
			user.verified = true;
			yield user.$update(['verified']);
			yield v.$destroy();
		}else{
			throw api.authFailed('notAllowed', this.translate('Not Repeat.'));  
		}
		this.render( 'system/verifypass.html', {} );
	},

	'GET /auth/ConfirmEmail': function*(){
		this.render( 'system/reconfirmemail.html', {} );
	}, 

	'GET /auth/signout': function* () {
		this.cookies.set(COOKIE_NAME, 'deleted', {
			path: '/',
			httpOnly: true,
			expires: new Date(0)
		});
		var redirect = '/login';
		setHistoryUrl(this, getReferer(this.request) )
		log.debug('Signout, goodbye!');
		this.response.redirect(redirect);
	},

	'POST /api/auth/ConfirmEmail': function*(){
		var email, user, verify,
			data = this.request.body;
		json_schema.validate('confirmemail', data);
		email = data.email;
		user = yield $getUserByEmail(email);
		if( user === null ){
			throw api.notFound('email', this.translate('User not found.'));
		}
		if( user.verified ){
			throw api.notAllowed('email', this.translate('Email has been verified.'));
		}
		yield warp.$query( 'delete from sys_email_auth where `user_id`=?', [user.id] );

		verify = {
			id: next_id(),
			user_id: user.id,
			expired: Date.now() + 24 * 3600000
		};
		yield EmailAuth.$create(verify);
		_genEmailConfirm( this, user, verify );
		this.body = {
			result: 'ok'
		}
	},

	'POST /api/user/changepwd': function* (){
		var 
			user,
			localuser,
			email, 
			oldpassword, 
			newpassword,
			data = this.request.body;

		//validate data
		json_schema.validate('changePassword', data);

		/*if( !this.request.user ){
			throw api.authRequired('oldpassword', this.translate('Please log in first'));
		}*/
		user = this.request.user;
		oldpassword = data.oldpassword;
		newpassword = data.newpassword;
		email = user.email;

		localuser = yield LocalUser.$find({
			where:'`user_id`=?',
			params: [user.id]
		})
		if( localuser === null ){
			throw api.authFailed('oldpassword', this.translate('Please log in first'));
		}

		if( !auth.verifyPassword(email, oldpassword, localuser.passwd )){
			throw api.authFailed('oldpassword', this.translate('Old password invalid.'));
		}

		//modify password
		localuser.passwd = auth.generatePassword(email, newpassword);
		yield localuser.$update(['passwd']);

		// make session cookie:
		_makeSessionCooike( localuser, this.cookies );
		/*
		var 
			expires = Date.now() + LOCAL_SIGNIN_EXPIRES_IN_MS,
			cookieStr = auth.makeSessionCookie(constants.signin.LOCAL, localuser.id, localuser.passwd, expires);
		this.cookies.set( COOKIE_NAME, cookieStr, {
			path: '/',
			httpOnly: true,
			expires: new Date(expires)
		});*/
		log.debug('set session cookie for user: ' + user.email);
		this.body = {
			id: user.id
		};
	},

	'GET /api/user/:id': function*(id){
		var user = yield User.$find(id);
		if( user == null ){
			throw api.notFound('user', this.translate('User not found.'));
		}
		this.body = { id: id, username: user.username, name: user.name, email: user.email, actived: user.actived } 
	},

	'POST /api/user/:id/status': function* (id){
		var data = this.request.body,
			actived = !!data.actived,
			user = yield User.$find(id);

		if( user == null ){
			throw api.notFound('user', this.translate('User not found.'));
		}
		if( this.request.user.role !== constants.role.ADMIN ){
			throw api.notAllowed('user', "Only administrators can change user' status");
		}
		user.actived = actived;
		yield user.$update(['actived']);
		this.body = {
			result: 'ok'
		}
	},

	'POST /api/user/:id': function* (id){
		var data = this.request.body,
			user = yield User.$find(id);
		if( user == null ){
			throw api.notFound('user', this.translate('User not found.'));
		}
		json_schema.validate('userEdit', data);

		user.name = data.name;
		yield user.$update(['name']);
		this.body = {
			result: 'ok',
			redirect: '/'
		}
	},


	'LoginRequired': [ '/api/user/changepwd'] 
};