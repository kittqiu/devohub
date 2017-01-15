'use strict';

var 
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api'),
	Page = require( __base + 'lib/page'),
	home = require( __base + 'controller/home'), 
	json_schema = require( __base + 'lib/json_schema'),
	base = require('./base');

var 
	modelUser = db.user;

function* $_render( context, model, view ){
    context.render( 'project/' + view, yield home.$getModel.apply(context, [model]) );
}

/******
GET METHOD:
/project
/project/group/:id/edit
/project/history
/project/p/allDoing?page=xx
/project/p/allHistory?page=xx
/project/p/myDoing?page=xx
/project/p/myHistory?page=xx
/project/p/:id/build
/project/p/:id/daily
/project/p/:id/edit
/project/p/:id


/api/project/p/all?page=xx
/api/project/p/allDoing?page=xx
/api/project/p/allHistory?page=xx
/api/project/p/myDoing?page=xx
/api/project/p/myHistory?page=xx
/api/project/p/:id/daily?date=?
/api/project/p/:id/tasklist
/api/project/p/:id/taskrelylist
/api/project/p/:id
/api/project/task/:id/relylist

/api/project/group/:id
/api/project/task/:id



POST METHOD:

/api/project/p
/api/project/p/:id
/api/project/p/:id/delete
/api/project/p/:id/group
/api/project/p/:id/task
/api/project/group/:id
/api/project/task/:id
/api/project/task/:id/move?action=xx
/api/project/tasklist/updateplan

********/


module.exports = {
	'GET /project': function*(){
		yield $_render( this, {}, 'project.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p': function* (){
		yield $_render( this, {}, 'project_p.html');
	},

	'GET /project/group/:id/edit': function* (id){
		var group = yield base.modelGroup.$find(id),
			model = {
				__id: id,
				__project_id: group.project_id,
				__form: {
					src: '/api/project/group/' + id,
					action: '/api/project/group/' + id,
					submit: this.translate('Save')
			},
			roles: base.project.roleOptions(),
			users: yield base.project.$listOptionalUsers(group.project_id||'none')
		};
		yield $_render( this, model, 'p/group_form.html');
	},

	'GET /project/history': function*(){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT),
			model = {
				projects: yield base.project.$listUserJoinOnEnd( this.request.user.id ),
				__perm_Create: canCreate
			};
		yield $_render( this, model, 'project_index.html');
		base.setHistoryUrl(this);
	},
	'GET /project/p/allDoing': function* (){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT),
			model = {
			__page: this.request.query.page || 1,
			__perm_Create: canCreate
		};
		yield $_render( this, model, 'p/project_all.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p/allHistory': function*(){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT),
			model = {
				__page: this.request.query.page || 1,
				__perm_Create: canCreate
			};
		yield $_render( this, model, 'p/project_all_history.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p/myDoing': function*(){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT),
			model = {
				__page: this.request.query.page || 1,
				__perm_Create: canCreate
			};
		yield $_render( this, model, 'p/project_mine.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p/myHistory': function*(){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT),
			model = {
				__page: this.request.query.page || 1,
				__perm_Create: canCreate
			};
		yield $_render( this, model, 'p/project_my_history.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p/:id/build': function* (id){
		var hasPerm = yield base.user.$havePermEditProject(this,id),
			project = yield base.project.$get(id) || {},
			model = {
				__id: id,
				__mode__: hasPerm?'rw':'ro'
			};
		yield $_render( this, model, 'p/project_build.html');
	},
	'GET /project/p/:id/daily': function* (id){
		yield $_render( this, {__id:id}, 'p/project_daily.html');
		base.setHistoryUrl(this);
	},
	'GET /project/p/:id/edit': function* (id){
		var model = {
				__id: id,
				statusOptions: base.project.statusOptions(),
				roleOptions: base.project.roleOptions(),
				users: yield base.user.$list(),
				__form: {
					src: '/api/project/p/' + id,
					submit: this.translate('Save'),
					action: '/api/project/p/' + id
				}
			};
		yield $_render( this, model, 'p/project_edit.html');
	},

	'GET /project/p/:id': function* (id){
		var model = {
				__id: id,
				statusOptions: base.project.statusOptions(),
				roleOptions: base.project.roleOptions()
			};
		yield $_render( this, model, 'p/project_view.html');
	},

	'GET /api/project/p/all': function*(){
		var index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = base.config.PAGE_SIZE,
			page = new Page(index, page_size), 
			rs = yield yield base.project.$list( page_size*(index-1), page_size);
		page.total = yield base.project.$count();
		this.body = { page:page, projects: rs};
	},

	'GET /api/project/p/allDoing': function*(){
		var index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield yield base.project.$listAllOnRun( page_size*(index-1), page_size),
			total = yield base.project.$countAllOnRun();
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/allHistory': function*(){
		var	index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield yield base.project.$listAllOnEnd( page_size*(index-1), page_size),
			total = yield base.project.$countAllOnEnd();
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/myDoing': function*(){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) : base.config.PAGE_SIZE,
			rs = yield yield base.project.$listUserJoinOnRun( uid, page_size*(index-1), page_size),
			total = yield base.project.$countUserJoinOnRun(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/myHistory': function*(){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) : base.config.PAGE_SIZE,
			rs = yield yield base.project.$listUserJoinOnEnd( uid, page_size*(index-1), page_size),
			total = yield base.project.$countUserJoinOnEnd(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/group/:id': function* (id){
		this.body = yield base.group.$get(id);
	},

	'GET /api/project/p/:id/daily': function* (id){
		var date = parseInt(this.request.query.date||'0') || Date.now();
		this.body = yield base.daily.$listProject(id, date);
	},

	'GET /api/project/p/:id/tasklist': function* (id){
		this.body = yield base.project.$listTasks(id);
	},

	'GET /api/project/p/:id/taskrelylist': function* (id){
		this.body = yield base.project.$listTaskRelies(id);
	},

	'GET /api/project/p/:id': function* (id){
		this.body = yield base.project.$get(id) || [];
	},

	'GET /api/project/task/:id/relylist': function*(id){
		this.body = yield base.task.$listRelies(id) || [];
	},

	'GET /api/project/task/:id': function* (id){
		/*var t = yield base.modelTask.$find(id),
			relies = yield base.task.$listRelies(id) || [];
		t.rely = relies;*/
		var t = yield base.task.$get(id);
		this.body = t;
	},

	'POST /api/project/group/:id': function* (id){
		var r = yield base.modelGroup.$find(id), 
			data = this.request.body || {}, 
			members = data.members;
		if( !data.name ){
			throw api.invalidParam('name');
		}
		if( r === null ){
			throw api.notFound('group', this.translate('Record not found'));
		}
		yield db.op.$update_record( r, data, ['name']);

		if( members ){
			for( var i = 0; i < members.length; i++ ){
				var m = members[i];
				if( m.id ){//update
					var mr = yield base.modelMember.$find(m.id);
					if( mr !== null ){
						yield db.op.$update_record( mr, m, ['role', 'responsibility']);
					}
				}else{//add new member
					var user = {
						project_id: r.project_id,
						user_id: m.user_id,
						group_id: r.id,
						responsibility: m.responsibility,
						role: m.role
					};
					yield base.modelMember.$create(user);
				}
			}
		}

		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/p': function* (){
		var r, user,
			data = this.request.body;
		json_schema.validate('project_create', data);
		yield base.user.$testPerm(this, base.config.PERM_CREATE_PROJECT);

		r = {
			id: db.next_id(),
			creator_id: this.request.user.id,
			name: data.name, 
			master_id: data.master_id,
			start_time: data.start_time,
			end_time: data.end_time,
			details: data.details
		};		

		user = {
					project_id: r.id,
					user_id: r.master_id,
					group_id: base.config.MASTER_GROUP,
					responsibility: '',
					role: 'master'
				};
		yield base.modelMember.$create(user);
		yield base.modelProject.$create( r );
		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/p/:id/delete': function* (id){
		var uid = this.request.user.id;

		if( !(yield base.user.$isAdmin(uid))){
			throw api.notAllowed('Deleting the project need administrator permission. ');
		}
		yield base.project.$destroy(id);

		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/p/:id/group': function* (id){
		var r, 
			data = this.request.body || {},
			name = data.name;
		if( !name ){
			throw api.invalidParam('name');
		}
		
		r = {
			id: db.next_id(),
			project_id: id,
			name: name
		}
		yield base.modelGroup.$create(r);
		this.body = { result: 'ok', data: r };
	},
	/*create a task*/
	'POST /api/project/p/:id/task': function* (id){
		var t, order,
			data = this.request.body || {},
			pid = data.parent || 'root';
		json_schema.validate('simpleTask', data);
		
		order = yield base.task.$maxOrder(id, pid);
		order++;
		t = {
			id: db.next_id(),
			project_id: id,
			parent: pid,
			name: data.name,
			automode: data.automode,
			order: order,
			plan_duration: data.duration,
			plan_start_time: data.start_time,
			plan_end_time: data.end_time,
			difficulty: data.difficulty,
			closed: 0,
			details: data.details,
			executor_id: data.executor,
			manager_id: this.request.user.id,
			start_time:0,
			end_time:0,
			status: 'created'
		};
		yield base.modelTask.$create(t);
		yield base.task.$setRelies(t.id, t.project_id, data.relyTo);
		yield base.task.$sendNoticeEmail( t.id, "您有一个新建的任务---来自项目管理系统" );
		this.body = { result: 'ok', id: t.id };
	},

	'POST /api/project/p/:id': function* (id){
		var r, cols = [],
			data = this.request.body;
		json_schema.validate('project', data);

		r = yield base.modelProject.$find( id );
		if( r === null ){
			throw api.notFound('project', this.translate('Record not found'));
		}

		if( r.master_id !== data.master_id ){
			yield base.project.$changeMaster(id, data.master_id);
		}
		yield db.op.$update_record( r, data, ['name', 'start_time', 'end_time', 'details', 'master_id', 'status'])
		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/task/:id/move': function*(id){
		var data = this.request.body,
			action = data.action || 'up',
			t = yield base.modelTask.$find(id);
		if( t === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}
		if( action === 'up'){
			yield base.task.$moveUp(id);
		}else if (action === 'down') {
			yield base.task.$moveDown(id);
		}else if( action === 'update_parent'){
			yield base.task.$changeParent(id, data.parent||'root', data.new_order);
		}
		this.body = { result: 'ok'}
	},
	/*edit a task*/
	'POST /api/project/task/:id': function* (id){
		var r, cols = [],
			data = this.request.body,
			relies = data.relyTo;
		json_schema.validate('editTask', data);

		r = yield base.modelTask.$find( id );
		if( r === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}

		yield db.op.$update_record( r, data, 
			['name', 'executor_id', 'manager_id', 'plan_duration', 'plan_start_time', 'plan_end_time', 
				'automode', 'difficulty', 'details'])
		yield base.task.$setRelies(id, r.project_id,relies);
		yield base.task.$sendNoticeEmail( id, "您的任务信息发生了变更---来自项目管理系统" );			

		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/tasklist/updateplan':function* (){
		var data = this.request.body;
		if( data instanceof(Array)){
			for( var i = 0; i < data.length; i++ ){
				var item = data[i];
				var t = yield base.modelTask.$find(item.id);
				if( t ){
					t.plan_start_time = item.plan_start_time;
					t.plan_end_time = item.plan_end_time;
					yield t.$update(['plan_start_time', 'plan_end_time'])
				}
			}
		}
		this.body = { result: 'ok'}
	},

	'LoginRequired': [ /^\/project[\s\S]*/, /^\/api\/project[\s\S]*/]
};