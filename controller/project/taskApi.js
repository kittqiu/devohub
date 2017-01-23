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

var ACTIONMAP = {
	accept: '确认接收',
	reply: '回复',
	commit: '提交',
	pause: '暂停执行',
	cancel: '取消任务',
	complete: '完成',
	reopen: '继续执行',
	resume: '恢复执行'
};

var FLOWNOTICES = {
	confirm:{ title: '您有一个可开始执行的任务---来自项目管理系统', recipient:'executor' },
	accept:{ title: '您管理的一个任务已开始执行---来自项目管理系统', recipient:'manager' },
	commit:{ title: '您管理的一个任务已提交，待审核---来自项目管理系统', recipient:'manager' },
	complete:{ title: '您的任务已被审核通过---来自项目管理系统', recipient:'executor' },
	cancel:{ title: '您的任务已被取消---来自项目管理系统', recipient:'executor' },
	pause:{ title: '您有一个正在执行的任务已被暂停---来自项目管理系统', recipient:'executor' },
	resume:{ title: '您有一个已暂停的任务被重新恢复执行---来自项目管理系统', recipient:'executor' },
	reopen:{ title: '您的一个任务未被审核通过，需要继续执行---来自项目管理系统', recipient:'executor' },
	reply: { title: '您的一个任务有了新的回复信息---来自项目管理系统', recipient:'all' }
};


/******
GET METHOD:
/project/daily
/project/daily/team
/project/task
/project/task/history
/project/task/manage
/project/task/manage/history
/project/task/plan

/api/project/daily?date=xx
/api/project/t/listExecuting?uid=xx
/api/project/t/listManage?uid=xx
/api/project/t/listQueue?uid=xx
/api/project/t/history/listCompleted?uid=xx&&page=x
/api/project/t/history/listManage?uid=xx&&page=x
/api/project/t/:id/listFlow
/api/project/t/:id/daily
/api/project/u/:id/daily?date=xx
/api/project/u/:id/monthwork?year=xx&&month=xx


POST METHOD:
/api/project/t/:id/flow
/api/project/daily/creation
/api/project/daily/:id

********/


module.exports = {
	'GET /project/daily': function* (){
		yield $_render( this, {}, 'daily/mydaily.html');
		base.setHistoryUrl(this);
	},

	'GET /project/daily/team': function* (){
		yield $_render( this, {}, 'daily/team_daily.html');
		base.setHistoryUrl(this);
	},

	'GET /project/task': function* (){
		yield $_render( this, {}, 'task/task_index.html');
		base.setHistoryUrl(this);
	},

	'GET /project/task/plan': function* (){
		yield $_render( this, {}, 'task_plan.html');
		base.setHistoryUrl(this);
	},

	'GET /api/project/daily': function* (){
		var uid = this.request.user.id || '',
			date = parseInt(this.request.query.date||'0') || Date.now();
		this.body = yield base.daily.$listUser(uid, date);
	},

	'GET /api/project/t/listExecuting': function* (){
		var uid = this.request.query.uid || this.request.user.id;
		var data = yield base.task.$listExecutingOfUser(uid);
		this.body = {total:data.length, rows:data};
	},

	'GET /api/project/t/listManage': function* (){
		var uid = this.request.query.uid || this.request.user.id;
		var data = yield base.task.$listManageOfUser(uid);
		this.body = {total:data.length, rows:data};
	},

	'GET /api/project/t/listQueue': function* (){
		var uid = this.request.query.uid || this.request.user.id;
		var data = yield base.task.$listQueueOfUser(uid);
		this.body = {total:data.length, rows:data};
	},

	'GET /api/project/t/history/listCompleted': function* (){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || '1',
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield base.task.$listHistoryExecuteOfUser(uid, page_size*(index-1), page_size),
			total = yield base.task.$countHistoryExecuteOfUser(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/t/history/listManage': function* (){
		var uid = this.request.query.uid || this.request.user.id,
			index = this.request.query.page || "1",
			index = parseInt(index),
			page_size = this.request.query.rows ? parseInt(this.request.query.rows) :base.config.PAGE_SIZE,
			rs = yield base.task.$listHistoryManageOfUser(uid, page_size*(index-1), page_size),
			total = yield base.task.$countHistoryManageOfUser(uid);
		this.body = { total:total, rows: rs};
	},

	'GET /api/project/t/:id/listFlow': function* (id){
		this.body = yield base.task.$listFlow(id);
	},

	'GET /api/project/t/:id/daily': function* (id){
		this.body = yield base.task.$listDaily(id);
	},

	'GET /api/project/u/:uid/daily': function* (uid){
		var date = parseInt(this.request.query.date||'0') || Date.now();
		this.body = yield base.daily.$listUser(uid, date);
	},

	'GET /api/project/u/:uid/monthwork': function* (uid){
		var y = parseInt( this.request.query.year || '2016'),
			m = parseInt(this.request.query.month || '0');
		this.body = yield base.daily.$listUserByMonth( uid, y, m );
	},

	'POST /api/project/daily/creation': function* (){
		var data = this.request.body,
			task, daily;

		json_schema.validate('workDaily', data);
		task = yield base.modelTask.$find( data.task_id );
		if( task === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}
		daily = {
			id: db.next_id(),
			project_id: task.project_id,
			task_id: data.task_id,
			user_id: this.request.user.id,
			report: data.report,
			duration: data.duration,
			plan: data.plan,
			time: data.time
		}
		task.duration += data.duration;
		task.percent = data.percent;
		yield task.$update(['duration', 'percent']);
		yield base.modelDaily.$create(daily);

		this.body = { id: daily.id, result: 'ok'};
	},

	'POST /api/project/daily/:id':function* (id){
		var data = this.request.body,
			r = yield base.modelDaily.$find(id),
			task;

		json_schema.validate('workDaily', data);
		if( r === null ){
			throw api.notFound('daily', this.translate('Record not found'));
		}
		task = yield base.modelTask.$find( r.task_id );
		if( task === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}
		task.duration = task.duration - r.duration + data.duration;
		task.percent = data.percent;
		yield task.$update(['duration', 'percent']);
		yield db.op.$update_record( r, data, ['report', 'plan', 'duration']);
		this.body = { result: 'ok'};
	},

	'POST /api/project/t/:id/flow': function* (id){
		var data = this.request.body,
			task, flow,
			action = data.action;

		json_schema.validate('taskFlow', data);
		task = yield base.modelTask.$find( id );
		if( task === null ){
			throw api.notFound('task', this.translate('Record not found'));
		}

		flow = {
			task_id: task.id,
			user_name: this.request.user.name,
			action: action,
			reply: data.reply
		}

		if( task.status === 'clear' && action === 'accept'){
			task.start_time = Date.now();
			yield task.$update(['start_time']);			
		}else if( data.action === 'cancel' || action === 'complete'){
			task.end_time = Date.now();
			yield task.$update(['end_time']);
		}
		yield base.modelTaskFlow.$create(flow);
		yield base.task.$nextFlow(task, data.action);

		if( FLOWNOTICES.hasOwnProperty(action)){
			var notice = FLOWNOTICES[action],
				recipients = [],
				uid = this.request.user.id;
			if( notice.recipient === 'executor'){
				recipients.push( task.executor_id );
			}else if( notice.recipient === 'manager' ){
				recipients.push( task.manager_id );
			}else{//all
				if( uid !== task.executor_id ){
					recipients.push( task.executor_id );
				}
				if( uid !== task.manager_id ){
					recipients.push( task.manager_id );
				}
				if( uid === task.executor_id && task.executor_id === task.manager_id ){
					recipients.push( task.executor_id );
				}
			}
			yield base.task.$sendNoticeEmail( id, notice.title, recipients, data.reply );
		}
		this.body = { result: 'ok'};		
	},


};