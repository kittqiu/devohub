'use strict';

var 
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api'),
	home = require( __base + 'controller/home'), 
	json_schema = require( __base + 'lib/json_schema'),
	base = require('./base');

var 
	modelDep = db.team_department,
	modelUser = db.user;

function* $_render( context, model, view ){
    context.render( 'team/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/team/structure/
/team/structure/department/:id/edit

/api/team/department/list
/api/team/department/:id
/api/team/department/users
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
		yield $_render( this, {}, 'structure.html');
		base.setHistoryUrl(this);
	},

	'GET /team/structure/department/:id/edit': function* (id){
		var dep = yield base.$getDepartment(id),
			form = {
				src: '/api/team/department/' + id,
				name: this.translate('Edit') + this.translate('Department'),
				submit: this.translate('Save'),
				action: '/api/team/department/' + id
			},
			model = {
				__id: id,
				__form: form, 
				parent: yield base.$getDepartment(dep.parent)
			};
		yield $_render( this, model, 'department_form.html');
	},

	'GET /api/team/department/freeusers': function* (){
		this.body = yield base.member.$getFree();
	},

	'GET /api/team/department/list': function* (){
		this.body = yield base.department.$list();
	},

	'GET /api/team/department/users': function* (){
		this.body = yield base.department.$listUsers();
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
				m.department = data.department;
				cols.push('department');
			}
			if( cols.length > 0 ){
				yield m.$update(cols);
			}			
		}
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
		this.body = { result: 'ok'};
	}

};