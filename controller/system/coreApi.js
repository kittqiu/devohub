'use strict';
var 
	fs = require('fs'),	
	parse = require('co-busboy'), 
	attachment = require( './attachment'), 
	helper = require(__base + 'lib/helper'),
	api = require(__base + 'lib/api'),
	db = require(__base + 'lib/db'), 
	perm = require('./permission'),
	config = require('./config'),
	home = require( __base + 'controller/home');

var 
	modelAtt = db.attachment,
	modelUser = db.user,
	getId = helper.getId;

function* $_render( context, model, view ){
	context.render( 'system/' + view, yield home.$getModel.apply(context, [model]) );
}

/*
GET:
/sys/error/auth
/api/file/:id
/api/date/isworkday?year=xxx&&month=xx&&date=xx
/api/date/list?year=xxx
/api/help?path=encodeURIComponent(path)

/api/sys/role/list
/api/sys/user/:id/roles

POST:
/api/date/workday/add
/api/date/workday/:id/switch
/api/file?t=?
/api/sys/user/:id/roles

*/

module.exports = {
	/***************** GET METHOD *********/
	'GET /sys/error/auth': function* (){
		yield $_render(this, {__message__:'您无权限访问该资源！'}, 'error.html');
	},

	'GET /api/date/isworkday': function* (){
		var q = this.request.query,
			y = q.year || 2016,
			m = q.month || 0,
			d = q.date || 1;
		this.body = yield config.date.$isWorkDate( y, m, d );
	},

	'GET /api/date/list': function* (){
		var year = this.request.query.year || '2016';
		this.body = yield config.date.$listByYear(year);
	},

	'GET /api/file/:id': function* (id){
		var att = yield modelAtt.$find(id);

		if( att != null ){
			this.attachment(att.name); 
			this.body = fs.createReadStream( att.path );
		}else{
			throw api.notFound( id );
		}
	},

	'GET /api/sys/role/list': function* (){
		this.body = yield perm.role.$list();
	},

	'GET /api/sys/user/:id/roles': function* (id){
		this.body = yield perm.user.$listRoles(id);
	},

	/***************** POST METHOD *********/
	'POST /api/date/workday/add': function* (){
		var data = this.request.body || {},
			year = data.year || 2016,
			month = data.month || 0,
			date = data.date || 1,
			isworkday = data.isworkday;
		var res = yield config.date.$addWorkDate( year, month, date, isworkday);
		this.body = {
			result: res? 'ok': 'err'
		};
	},

	'POST /api/date/workday/:id/switch':function*(id){
		var res = yield config.date.$switchWorkDate(id);
		this.body = {
			result:  res ? 'ok' : 'err'
		};
	},

	'POST /api/file': function* (){
		if( !this.request.is('multipart/*')){
			return yield next;
		}    	

		var part,
			subsys = this.request.query.t || 'system',    		
			parts = parse(this), files = [];
		while( part = yield parts ){
			if (part.length) {
			  // arrays are busboy fields 
			  console.log('key: ' + part[0])
			  console.log('value: ' + part[1])
			} else {
				// otherwise, it's a stream
				var file = {}, id;
				//console.dir( part );
				file = yield attachment.$saveTmpFile( part, part.filename );
				id = yield attachment.$createAttachment( file.path, part.filename, subsys );
				files.push({attid:id, name:part.filename})
				console.log( part.filename );
			}
		}
		this.body = {
			result: 'ok',
			files: files
		};
	},

	'POST /api/sys/user/:id/roles': function* (uid){
		var u = yield modelUser.$find(uid),
			data = this.request.body;

		if( u === null ){
			throw api.notFound('user', this.translate('Record not found'));
		}
		yield perm.user.$setRoles(uid, data);
		this.body = { result: 'ok' };
	},

	'LoginRequired': [ /^\/sys[\s\S]*/, /^\/api\/file[\s\S]*/]
};