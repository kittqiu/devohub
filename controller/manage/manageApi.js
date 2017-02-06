'use strict';

var 
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api'),
	home = require( __base + 'controller/home'), 
	json_schema = require( __base + 'lib/json_schema'),
	base = require('./base'),
	perm = require( __base + 'controller/system/permission');;

var 
	modelUser = db.user;

function* $_render( context, model, view ){
	context.render( 'manage/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/manage
/manage/config/workday
/manage/project
/manage/user/role
/manage/user


POST METHOD:
/api/manage/user/:id/roles
/api/manager/user/:uid/departmentsCanAccess

*************/

module.exports = {
	'GET /manage': function* (){
		yield $_render( this, {}, 'manage_index.html');
		base.setHistoryUrl(this);
	},
	'GET /manage/config/workday': function* (){
		yield $_render( this, {}, 'config_workday.html');
		base.setHistoryUrl(this);
	},
	'GET /manage/user': function* (){
		yield $_render( this, {}, 'user.html');
		base.setHistoryUrl(this);
	},
	'GET /manage/user/role': function* (){
		yield $_render( this, {}, 'role.html');
		base.setHistoryUrl(this);
	},
	'GET /manage/user/role': function* (){
		yield $_render( this, {}, 'role.html');
		base.setHistoryUrl(this);
	},

	'GET /manage/project': function* (){
		yield $_render( this, {}, 'project.html');
		base.setHistoryUrl(this);
	},

	'POST /api/manage/user/:uid/roles': function* (uid){
		var u = yield modelUser.$find(uid),
			data = this.request.body;

		if( u === null ){
			throw api.notFound('user', this.translate('Record not found'));
		}
		yield perm.user.$setRoles(uid, data);
		this.body = { result: 'ok' };
	},

	'POST /api/manager/user/:uid/departmentsCanAccess': function* (uid){
		var u = yield modelUser.$find(uid),
			data = this.request.body;
		if( u === null ){
			throw api.notFound('user', this.translate('Record not found'));
		}

		yield perm.user.$setPermDepartments( uid, data );
		this.body = { result: 'ok' }
	},

	'LoginRequired': [ /^\/manage[\s\S]*/, /^\/api\/manage[\s\S]*/]
};