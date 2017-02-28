'use strict';

var 
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api'),
	Page = require( __base + 'lib/page'),
	home = require( __base + 'controller/home'), 
	constants = require(__base +'lib/constants'),
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
/api/project/groupmember/:id/delete
/api/project/task/:id
/api/project/task/:id/move?action=xx
/api/project/task/:id/milestone/toggle
/api/project/tasklist/updateplan

********/


module.exports = {
	'GET /project': function*(){
		yield $_render( this, {}, 'project.html');
		base.setHistoryUrl(this);
	},

	'GET /project/p': function* (){
		var canCreate = yield base.user.$havePerm(this, base.config.PERM_CREATE_PROJECT);
		yield $_render( this, {__perm_Create: canCreate}, 'project_p.html');
	},

	'GET /project/p/:id/build': function* (id){
		var hasPerm = yield base.user.$havePermEditProject(this,id),
			model = {
				__id: id,
				__perm_Edit_: hasPerm
			};
		yield $_render( this, model, 'project_build.html');
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
		if( this.request.user.role !== constants.role.ADMIN ){
			throw api.notAllowed('user', "Only administrators can change user' status");
		}

		this.body = yield base.project.$listAll();
	},

	/*'GET /api/project/p/all': function*(){
		var index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = base.config.PAGE_SIZE,
			page = new Page(index, page_size), 
			rs = yield base.project.$list( page_size*(index-1), page_size);
		page.total = yield base.project.$count();
		this.body = { page:page, projects: rs};
	},*/

	'GET /api/project/p/allDoing': function*(){
		var index = this.request.query.page || '1',
			index = parseInt(index),
			uid = this.request.user.id,
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield base.project.$listAllOnRun( page_size*(index-1), page_size, uid),
			total = yield base.project.$countAllOnRun(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/allHistory': function*(){
		var	index = this.request.query.page || '1',
			index = parseInt(index),
			uid = this.request.user.id,
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield base.project.$listAllOnEnd( page_size*(index-1), page_size, uid),
			total = yield base.project.$countAllOnEnd(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/myDoing': function*(){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) : base.config.PAGE_SIZE,
			rs = yield base.project.$listUserJoinOnRun( uid, page_size*(index-1), page_size),
			total = yield base.project.$countUserJoinOnRun(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/p/myHistory': function*(){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) : base.config.PAGE_SIZE,
			rs = yield base.project.$listUserJoinOnEnd( uid, page_size*(index-1), page_size),
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
		if( (yield base.project.$allowUserView(id, this.request.user.id))){
			this.body = yield base.project.$listTasks(id);
		}else{
			this.body = {};
		}		
	},

	'GET /api/project/p/:id/taskrelylist': function* (id){
		if( (yield base.project.$allowUserView(id, this.request.user.id))){
			this.body = yield base.project.$listTaskRelies(id);
		}else{
			this.body = {};
		}
	},

	/**
	 * 得到项目信息，不仅包含项目model对象，而且包含
	 * master_name、creator_name、groups(成员组)和members(成员列表)
	 * groups是数组，每个元素是Group的model对象
	 * members是数组，每个元素不仅包含Member的model对象，还包含用户名name
	 */
	'GET /api/project/p/:id': function* (id){
		this.body = yield base.project.$get(id, this.request.user.id) || [];
	},

	'GET /api/project/task/:id/relylist': function*(id){
		this.body = yield base.task.$listRelies(id) || [];
	},

	'GET /api/project/task/:id': function* (id){
		var t = yield base.task.$get(id);
		this.body = t;
	},

	'POST /api/project/group/:id': function* (id){
		var r = yield base.modelGroup.$find(id), 
			data = this.request.body || {}, 
			members = data.members;
		
		if( id !== 'other' && r === null ){
			throw api.notFound('group', this.translate('Record not found'));
		}
		if( !!data.name ){
			yield db.op.$update_record( r, data, ['name']);
		}

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

	'POST /api/project/groupmember/:id/delete': function* (id){
		var r = yield base.modelMember.$find(id);
		if( r === null ){
			throw api.notFound('group member', this.translate('Record not found'));
		}
		if( (yield base.project.$hasUserTask(r.project_id, r.user_id))){
			throw api.notAllowed('项目中已有该成员相关任务。为了保证数据完整性，不能删除该成员！');
		}else{
			yield r.$destroy();
			this.body = { result: 'ok' };
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
			pid = data.parent || 'root',
			user = this.request.user;
		json_schema.validate('simpleTask', data);
		
		order = yield base.task.$maxOrder(id, pid);
		order++;
		t = {
			id: db.next_id(),
			project_id: id,
			parent: pid,
			name: data.name,
			automode: data.automode,
			milestone: data.milestone,
			order: order,
			plan_duration: data.duration,
			plan_start_time: data.start_time,
			plan_end_time: data.end_time,
			difficulty: data.difficulty,
			closed: 0,
			details: data.details,
			executor_id: data.executor,
			manager_id: user.id,
			start_time:0,
			end_time:0,
			status: 'created'
		};
		yield base.modelTask.$create(t);
		yield base.task.$setRelies(t.id, t.project_id, data.relyTo);
		if( data.difficulty !== 99 ){
			yield base.task.$sendNoticeEmail( t.id, user.name + "给你创建了新任务", [data.executor],
				"待工作审核人确认完需求后，该任务才可开始执行。届时，系统将向你发送邮件通知。", [user.id] );
		}
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
		yield db.op.$update_record( r, data, ['name', 'start_time', 'end_time', 'details', 'master_id', 'status', 'security_level'])
		this.body = {
			result: 'ok',
			redirect: base.getHistoryUrl(this)
		}
	},

	'POST /api/project/task/:id/milestone/toggle': function*(id){
		var t = yield base.modelTask.$find(id);
		if( t === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}
		t.milestone = t.milestone == 0 ? 1: 0;
		yield t.$update(['milestone']);
		this.body = { result: 'ok'};
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
				'automode', 'milestone','difficulty', 'details']);
		if( data.relyTo !== undefined ){
			yield base.task.$setRelies(id, r.project_id,relies);
		}		
		//yield base.task.$sendNoticeEmail( id, "您的任务信息发生了变更---来自项目管理系统" );			

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