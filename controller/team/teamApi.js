'use strict';

var 
	base = require('./base'),
	home = require( __base + 'controller/home'),
	db = require( __base + 'lib/db');

function* $_render( context, model, view ){
    context.render( 'team/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/team
/api/team/member/list?contain_unactived=false
/api/team/member/:id/roles
/api/team/member/:id

POST METHOD:


*************/

module.exports = {
	'GET /team': function*(){
		yield $_render( this, {}, 'team.html');
	},

	'GET /api/team/member/list': function* (){
		var q = this.request.query,
			contain_unactived = q.contain_unactived || 'false';
		
		this.body = yield base.member.$getUsers( contain_unactived=='true');
	},

	'GET /api/team/member/:id/roles': function* (id){
		this.body = yield base.member.$listRoles(id);
	},

	'GET /api/team/member/:id': function* (id){
		this.body = yield base.member.$collectUser(id);
	},

	'LoginRequired': [ /^\/team[\s\S]*/, /^\/api\/team[\s\S]*/]
};