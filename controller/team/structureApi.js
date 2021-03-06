'use strict';

var 
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api'),
	home = require( __base + 'controller/home'), 
	json_schema = require( __base + 'lib/json_schema'),
	base = require('./base'),
	cache = require('./team_cache');

var 
	modelDep = db.team_department,
	modelUser = db.user;

function* $_render( context, model, view ){
	context.render( 'team/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/team/structure/
/team/structure/tree

/api/team/department/list?scopelimit=true or onlyroot=true
/api/team/department/:id
/api/team/department/users?scopelimit=true
/api/team/department/freeusers

POST METHOD:
/api/team/department?parent=xx&before=xx
/api/team/department/:id
/api/team/department/:id/delete
/api/team/department/:id/order?action=xx
/api/team/member/u/:uid?department=xx
/api/team/member/updateusers

*************/

module.exports = {
	'GET /team/structure': function* (){
		var canEdit = yield base.$havePerm(this, base.PERM_EDIT_STRUCTURE);
		yield $_render( this, {__perm_Edit__:canEdit}, 'structure.html');
		base.setHistoryUrl(this);
	},

	/*返回团队树型页面*/
	'GET /team/structure/tree': function* (){
		yield $_render( this, {}, 'structure_tree.html');
	},

	'GET /api/team/department/freeusers': function* (){
		this.body = yield base.member.$getFree();
	},

	'GET /api/team/department/list': function* (){
		var 
			param = this.query || {};
		if( param.scopelimit ){
			this.body = yield base.department.$list_scope_limit(this.request.user.id);
		}else if( param.onlyroot ){
			this.body = yield base.department.$list_root();
		}else{
			this.body = yield base.department.$list();
		}		
	},

	'GET /api/team/department/users': function* (){
		var 
			param = this.query || {};
		if( param.scopelimit ){
			this.body = yield base.department.$listUsers_scope_limit(this.request.user.id);
		}else{
			this.body = yield base.department.$listUsers();
		}
	},

	'GET /api/team/department/:id': function* (id){
		this.body = yield modelDep.$find(id);
	},

	'POST /api/team/department': function* (){
		var r,
			data = this.request.body;
		json_schema.validate('simpleDepartment', data);
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);

		r = {
			name: data.name,
			type: 'department',
			parent: data.pid,
			order: (yield base.department.$getMaxOrder(data.pid)) + 1,
			duty: ''
		};
		yield modelDep.$create( r );
		yield cache.$reinit();
		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/team/department/:id': function* (id){
		var r, orgParentId, orgOrder, columns = [],
			data = this.request.body;
		json_schema.validate('simpleDepartment', data);
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);

		r = yield base.$getDepartment(id);
		if( r === null ){
			throw api.notFound('department');
		}
		if( r.name !== data.name ){
			columns.push('name');
			r.name = data.name;
		}
		if( r.parent !== data.pid ){
			orgParentId = r.parent;
			orgOrder = r.order;
			columns.push('parent');
			r.parent = data.pid;
			r.order = (yield base.department.$getMaxOrder(data.pid)) + 1;
			columns.push('order');
		}
		//if( r.order != data)
		if( columns.length !== 0 ){
			yield r.$update(columns);
		}

		if( orgParentId ){
			yield base.department.$deleteOrder( orgParentId, orgOrder );
		}

		yield cache.$reinit();
		this.body = {
			redirect: base.getHistoryUrl(this)
		};
	}, 
	'POST /api/team/department/:id/delete':function* (id){
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);
		var r = yield base.$getDepartment(id);
		if( r === null ){
			throw api.notFound('department');
		}
		var isLeaf = yield base.department.$isLeaf(id);
		if( !isLeaf ){
			throw api.notAllowed('department is not empty');
		}
		yield base.department.$deleteOrder(r.parent, r.order);
		yield r.$destroy();

		yield cache.$reinit();
		this.body = {
			result:'ok'
		}
	},
	'POST /api/team/department/:id/order': function* (id){
		var r = yield base.$getDepartment(id),
			action = this.request.query.action || 'up';
		if( r === null ){
			throw api.notFound('department');
		}
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);
		if( action === 'up' ){
			yield base.department.$changeOrder(id, -1 );
		}else if( action === 'down' ){
			yield base.department.$changeOrder(id, 1 );
		}
		yield cache.$reinit();
		this.body = {
			result:'ok'
		}
	},
	'POST /api/team/member/u/:uid': function* (uid){
		var u = yield modelUser.$find(uid),
			m = yield base.member.$getUser(uid),
			data = this.request.body,
			cols = [];
		if( u === null ){
			throw api.notFound('user');
		}
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);
		if( m === null ){
			yield base.$member_create(uid,data.department);
		}else{
			if( data.hasOwnProperty('department')){
				//只有管理员才能把自己从组织树中删除
				if( this.request.user.id === uid &&data.department === '' 
					&& !(yield base.member.$isAdminRole(uid)) ){
					throw api.notAllowed( "不允许将删除本人！" )
				}
				m.department = data.department;
				cols.push('department');
			}
			if( cols.length > 0 ){
				yield m.$update(cols);
			}			
		}
		yield cache.$reinit();
		this.body = { result: 'ok' }
	},

	'POST /api/team/member/updateusers': function*(){
		yield base.$testPerm(this, base.PERM_EDIT_STRUCTURE);
		var data = this.request.body || [];
		if( data instanceof(Array)){
			for( var i = 0; i < data.length; i++ ){
				var item = data[i];
				var m = yield base.member.$getUser(item.id);
				if( m !== null ){
					if( item.hasOwnProperty('department')){
						if( m.department !== item.department ){
							m.department = item.department;
							yield m.$update(['department'])
						}
					}
				}else{
					yield base.$member_create(item.id,item.department);
				}
			}
		}
		yield cache.$reinit();
		this.body = { result: 'ok'};
	}

};