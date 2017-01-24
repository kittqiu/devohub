'use strict';

/**
 * Authenticate users.
 * 
 * How to generate password:
 * 
 * user's email: user@example.com
 * user's password: HelloWorld
 * send hashed password for authentication:
 *   {
 *     email: 'user@example.com',
 *     passwd: 'fa54b4176373caef36be50474880541de1894428' // => sha1('user@example.com' + ':' + 'HelloWorld')
 *   }
 * verify in db:
 * db_password = loadFromDatabase(); // => 'f901cedb0cfbd27bfdb69d8b66e1f49a9fe0d0fe'
 * authenticated = db_password === sha1(user_id + ':' + 'fa54b4176373caef36be50474880541de1894428')
 * 
 * that means, there are 2 sha1-hash for user's original password, and the salt is user's email and id.
 */

var
	crypto = require('crypto'),
	config = require( './config'),
	constants = require( './constants'), 
	db = require( './db'),
	_ = require('lodash'),
	api = require( './api'),
	log = require( './logger');

var 
	User = db.user,
	LocalUser = db.localuser;

var 
	COOKIE_NAME = config.session.cookie,
	COOKIE_SALT = config.session.salt,
	COOKIE_EXPIRES_IN_MS = config.session.expires * 1000;

// for safe base64 replacements:
var
	re_add = new RegExp(/\+/g),
	re_sla = new RegExp(/\//g),
	re_equ = new RegExp(/\=/g),
	re_r_add = new RegExp(/\-/g),
	re_r_sla = new RegExp(/\_/g),
	re_r_equ = new RegExp(/\./g);

function _generatePassword(salt, inputPassword){
	return crypto.createHash('sha1').update( salt + ':' + inputPassword ).digest('hex');
}

function _verifyPassword( salt, inputPassword, expectedPassword ){
	return expectedPassword === crypto.createHash('sha1').update( salt + ':' + inputPassword ).digest('hex');
}

// string -> base64:
function _safe_b64encode(s) {
	var b64 = new Buffer(s).toString('base64');
	return b64.replace(re_add, '-').replace(re_sla, '_').replace(re_equ, '.');
}

// base64 -> string
function _safe_b64decode(s) {
	var b64 = s.replace(re_r_add, '+').replace(re_r_sla, '/').replace(re_r_equ, '=');
	return new Buffer(b64, 'base64').toString();
}

// Generate a secure client session cookie by constructing string:
// base64(provider:id:expires:sha1(provider:id:expires:passwd:salt)).
function makeSessionCookie(provider, theId, passwd, expires) {
	var 
		now = Date.now(),
		min = now + 86400000, //1 day
		max = now + 2592000000, // 30 days
		secure, sha1, str;
	if( !expires ){
		expires = now + COOKIE_EXPIRES_IN_MS;
	}else if( expires < min ){
		expires = min;
	}else if( expires > max ){
		expires = max;
	}
	secure = [provider, theId, String(expires), passwd, COOKIE_SALT ].join(':');
	sha1 = crypto.createHash('sha1').update(secure).digest('hex');
	str = [provider, theId, expires, sha1].join(':');
	log.debug('make session cookie: ' + str);
	log.debug('session cookie expires at ' + new Date(expires).toLocaleString());
	log.debug('secure: ' + secure + ', its sha1:' + sha1);
	var enstr =  _safe_b64encode(str);
	return enstr;
}

/*从数据库查找用户，并返回用户对象*/
function* $findUserAuthByProvider(provider, id) {
	var au, lu, user, passwd;
	if( provider === constants.signin.LOCAL ) {
		lu = yield LocalUser.$find(id);
		if( lu === null ) {
			return null;
		}
		passwd = lu.passwd;
		user = yield User.$find(lu.user_id);
	}
	else {
		/*au = yield AuthUser.$find(id);
		if (au === null) {
			return null;
		}
		passwd = au.auth_token;
		user = yield User.$find(au.user_id);*/
		return null;
	}
	return {
		user: user,
		passwd: passwd
	};
}


/*
 * 解析用户cookie对象，如果有效，则返回用户信息对象
 * 传入参数格式为provider:uid:expires:sha1
 * sha1的格式为provider:uid:expires:passwd:salt
 */
function* $parseSessionCookie(s) {
	var 
		ss = _safe_b64decode(s).split(':'),
		user,
		auth,
		theId, provider, expiresStr, expires, sha1, secure, expected;

	//解析得到各个session字段的值
	log.debug(ss);
	if( ss.length !== 4 ){
		return null;
	}
	provider = ss[0];
	theId = ss[1];
	expiresStr = ss[2];
	expires = parseInt( expiresStr, 10 );
	sha1 = ss[3];
	if( isNaN(expires) || (expires < Date.now()) || !theId || !sha1 ){
		return null;
	}

	//从数据库查到用户对象
	auth = yield $findUserAuthByProvider(provider, theId);
	if( auth === null ){
		return null;
	}
	
	//重新生成hash值，如果与Cookie中一致表示cookie有效
	secure = [provider, theId, expiresStr, auth.passwd, COOKIE_SALT ].join(':');
	expected = crypto.createHash('sha1').update(secure).digest('hex');
	log.debug('session secure: ' + secure);
	if (sha1 !== expected) {
		log.debug( 'Cookie for ' + auth.user.username + ' expired.' );
		return null;
	}
	if( auth.user.locked_until > Date.now()){
		log.warn('User is locked: ' + auth.user.email);
		return null;
	}
	return auth.user;
}

/**
 * middleware for bind user from session cookie
 * 从cookie中解析得到用户信息，并绑定的中间件，先是得到用户ID，并判断该用户是否有效，cookie是否过期，用户是否已被锁定。
 * 如果所有项合法，则从数据库查询得到用户信息，并绑定到session中
 */
function* $userIdentityParser(next){
	this.request.user = null;
	var 
		auth, 
		user,
		cookie = this.cookies.get(COOKIE_NAME);
	if(cookie){
		log.debug('try to parse session cookie...' + cookie);
		user = yield $parseSessionCookie(cookie);
		if( user ){
			user.passwd = '******';
			this.request.user = user;
			log.debug('bind user from session cookie: ' + user.email);
		}else{
			log.warn('invalid session cookie. cleared.');
			this.cookies.set( COOKIE_NAME, 'deleted', {
				path:'/',
				httpOnly: true, 
				expires: new Date(0)
			});
		}
		yield next;
		return;
	}
	/*auth = this.request.get('authorization');*/
	yield next;
}

/*用户访问页面时，判断是否需要满足登录条件*/
var authFixedPaths = [];	//需要登录授权的字符串类型的固定路径集合
var authPaths = [];			//需要登录授权的正则表达式类型的固定路径集合
/*注册需要先登录才可访问的URL地址。每次应用收到一个请求后，将判断
 目标地址是否在地址池中，如果是，则要求必须处于已登录状态。*/
function registerAuthPaths(paths){
	paths.forEach(function(p, index){
		if( p instanceof(RegExp)){
			authPaths.push(p);  
		}else if( p instanceof(String) ){
			authFixedPaths.push(p);
		}
	});
}
/* 判断当前访问的地址是否需要先登录，如果需要且未登录，则直接跳转至登录界面 */
function loginRequired(context){
	var path = context.request.path,
		required = false;
	if( _.indexOf(authFixedPaths, path) !== -1 ){
		required = true;
	}else{
	 	for( var i = 0; i < authPaths.length; i++ ){
	 		if( authPaths[i].test(path)){
	 			required = true;
	 			break;
	 		}
	 	}
	 }
	if( required && !context.request.user ){
		if( context.request.method === 'GET'){
			context.response.redirect('/login');
			return true;
		}else{
			throw api.authRequired();
		}
	}
	return false;
}

 module.exports = {

	generatePassword: _generatePassword,

	verifyPassword: _verifyPassword,

	makeSessionCookie: makeSessionCookie,

	$userIdentityParser: $userIdentityParser,

	registerAuthPaths: registerAuthPaths,

	loginRequired: loginRequired
 };