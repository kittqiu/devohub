'use strict';

var 
	_ = require('lodash'),
	fs = require('fs'),
	home = require('../home'),
	config = require( __base + 'lib/config'),
	db = require(__base + 'lib/db'),
	api = require(__base + 'lib/api'), 
	log = require(__base + 'lib/logger'), 
	json_schema = require(__base + 'lib/json_schema'),
	team_base = require( __base + 'controller/team/base'),
	helper = require( __base + 'lib/helper'),
	co = require('co'), 
	perm = require( __base + 'controller/system/permission'),
	swig = require('swig'),
	smtp = require( __base + 'controller/system/email');

require( 'useful-date' );
require( 'useful-date/locale/en-US.js' );

var models = {
	next_id: db.next_id,
	warp : db.warp
};

var 
	modelUser = db.user,
	modelProject = db.project,
	modelMember = db.project_member,
	modelGroup = db.project_member_group,
	modelTask = db.project_task,
	modelTaskRely = db.project_task_rely,
	modelTaskFlow = db.project_task_flow_record,
	modelDaily = db.project_daily,
	warp = models.warp;


var 
	DEFAULT_EXPIRES_IN_MS = 1000 * config.session.expires,
	PARENT_ROOT = 'root',
	MASTER_GROUP = 'manager';

function* init_database(){
	//perm.perm.$register('')
}

function MODULE_init(){
	co( init_database ).then( function (val) {
		 }, function (err) {
		  log.error(err.stack);
		});
}
MODULE_init();


function* $_render( context, model, view ){
	context.render( 'project/' + view, yield home.$getModel.apply(context, [model]) );
}

function setHistoryUrl( context, url ){
	if( arguments.length === 1){
		url = context.request.url;
	}
	context.cookies.set( 'PROJECT_HISTORYURL', url, {
		path: '/',
		httpOnly: true,
		expires: new Date(Date.now()+DEFAULT_EXPIRES_IN_MS)
	});
}

function getHistoryUrl( context ){
	var url = context.cookies.get('PROJECT_HISTORYURL');
	return url || '/project/';
}

/***** project *****/
function* $project_list(offset, limit){
	offset = offset ? offset : 0;
	limit = limit ? limit : 10;
	offset = offset < 0 ? 0: offset;
	limit = limit < 0 ? 10 : limit;

	var sql = 'select p.id, p.creator_id, p.master_id, u.name as master_name, p.name, p.start_time, p.end_time, p.status,p.details from project as p, ' 
		+ 'users as u where u.id = p.master_id order by p.created_at desc limit ? offset ? ';
	return yield warp.$query(sql, [limit, offset]);
}

function* $_project_forUser(uid, status ){
	var sql = 'select p.*, u.name as master_name from project as p left join users as u on u.id=p.master_id '
		+ ' where p.status=? and p.master_id=? order by p.created_at desc ';
	return yield warp.$query(sql, [status, uid]);		
}

function _project_combine(rs1, rs2){
	var pids = [], i;
	for(i = 0; i < rs1.length; i++ ){
		pids.push(rs1[i].id);
	}
	for(i = 0; i < rs2.length; i++ ){
		var r = rs2[i];
		if(pids.indexOf(r.id) === -1 ){
			rs1.push(r)
		}
	}
}

function* $__project_filter_scope( projects, uid ){
	var ws = yield team_base.member.$getCoworkers( uid );
	var rs_org = projects;
	var rs = [];
	for( var i = 0; i < rs_org.length; i++ ){
		var r = rs_org[i];
		if( ws.indexOf( r.master_id) !== -1 ){
			rs.push( r );
		}
	}
	return rs;
}

function*  $project_listAllOnRun(offset, limit, uid ){
	var sql = 'select p.*, u.name as master_name from project as p left join users as u on u.id=p.master_id '
		+ ' where p.status=? or p.status=? order by p.created_at desc ',
		rs;
	if( offset !== undefined ){
		sql += ' limit ? offset ?';
		offset = offset ? offset : 0;
		limit = limit ? limit : 10;
		offset = offset < 0 ? 0: offset;
		limit = limit < 0 ? 10 : limit;
		rs = yield warp.$query(sql, ['running', 'ready', limit, offset]);
	}else{
		rs = yield warp.$query(sql, ['running', 'ready']);	
	}

	//过滤自己无权访问的项目
	if( config.project.scope_limit ){
		rs = yield $__project_filter_scope( rs, uid );
	}
	return rs;
}

function* $project_count(){
	return yield modelProject.$findNumber( {
		select: 'count(*)'
	});
}

function* $project_delete(pid){
	yield warp.$query( 'delete from project_task_flow_record where task_id in (select id from project_task  where project_id=?)', [pid] );
	yield warp.$query( 'delete from project_daily where project_id=?', [pid] );
	yield warp.$query( 'delete from project_task_rely where project_id=?', [pid] );
	yield warp.$query( 'delete from project_task where project_id=?', [pid] );
	yield warp.$query( 'delete from project_member_group where project_id=?', [pid] );
	yield warp.$query( 'delete from project_member where project_id=?', [pid] );
	yield warp.$query( 'delete from project where id=?', [pid] );
}

function* $project_countAllOnRun(uid){
	if( config.project.scope_limit ){
		var ws = yield team_base.member.$getCoworkers( uid );
		var sql = "select count(*) from project where (`status`='running' or `status`='ready') and  master_id in ('"
			+ ws.join("','") + "')";
		return yield  warp.$query( sql );
	}else{
		return yield modelProject.$findNumber( {
			select: 'count(*)',
			where: '`status`=? or `status`=?',
			params: ['running', 'ready']
		});
	}	
}

function*  $project_listAllOnEnd(offset, limit, uid ){
	var sql = 'select p.*, u.name as master_name from project as p left join users as u on u.id=p.master_id '
		+ ' where p.status=? order by p.created_at desc ',
		rs;
	if( offset !== undefined ){
		sql += ' limit ? offset ?';
		offset = offset ? offset : 0;
		limit = limit ? limit : 10;
		offset = offset < 0 ? 0: offset;
		limit = limit < 0 ? 10 : limit;
		rs = yield warp.$query(sql, ['end', limit, offset]);
	}else{
		rs = yield warp.$query(sql, ['end']);	
	}

	//过滤自己无权访问的项目
	if( config.project.scope_limit ){
		rs = yield $__project_filter_scope( rs, uid );
	}
	return rs;
}

function* $project_countAllOnEnd(uid){
	if( config.project.scope_limit ){
		var ws = yield team_base.member.$getCoworkers( uid );
		var sql = "select count(*) from project where `status`='end' and  master_id in ('"
			+ ws.join("','") + "')";
		return yield  warp.$query( sql );
	}else{
		return yield modelProject.$findNumber( {
			select: 'count(*)',
			where: '`status`=? ',
			params: ['end']
		});
	}
}

function* $project_listUserJoinOnRun(uid, offset, limit){
	var sql = 'select p.*, u.name as master_name from project as p left join users as u on u.id=p.master_id '
		+ ' where ( p.status=? or p.status=? ) and p.id in ( select m.project_id from project_member as m where m.user_id=? ) order by p.created_at desc ',
		rs/*, ps, ps_ready*/;
	if( offset !== undefined ){
		sql += ' limit ? offset ?';
		offset = offset ? offset : 0;
		limit = limit ? limit : 10;
		offset = offset < 0 ? 0: offset;
		limit = limit < 0 ? 10 : limit;
		rs = yield warp.$query(sql, ['running', 'ready', uid, limit, offset]);
	}else{
		rs = yield warp.$query(sql, ['running', 'ready', uid]);	
	}

	// ps = yield $_project_forUser(uid, 'running');
	// ps_ready = yield $_project_forUser(uid, 'ready');
	// ps = ps.concat(ps_ready);
	// _project_combine(rs, ps);
	return rs;
}

function* $project_countUserJoinOnRun(uid){
	return yield modelProject.$findNumber( {
				select: 'count(*)',
				where: '( `status`=? or `status`=? ) and id in ( select m.project_id from project_member as m where m.user_id=? )',
				params: ['running', 'ready', uid]
			});
}

function* $project_listUserJoinOnEnd(uid, offset, limit){
	var sql = 'select p.*, u.name as master_name from project as p left join users as u on u.id=p.master_id '
		+ ' where p.status=? and p.id in ( select m.project_id from project_member as m where m.user_id=? ) order by p.created_at desc';
	if( offset !== undefined ){
		sql += ' limit ? offset ?';
		offset = offset ? offset : 0;
		limit = limit ? limit : 10;
		offset = offset < 0 ? 0: offset;
		limit = limit < 0 ? 10 : limit;
		return yield warp.$query(sql, ['end', uid, limit, offset]);
	}else
		return yield warp.$query(sql, ['end', uid]);	
}

function* $project_countUserJoinOnEnd(uid){
	return yield modelProject.$findNumber( {
				select: 'count(*)',
				where: '`status`=? and id in ( select m.project_id from project_member as m where m.user_id=? )',
				params: ['end', uid]
			});
}

/* get: project record, creator name, master name, groups, members*/
function* $project_get(id){
	var sql,
		p = yield modelProject.$find(id);
	if( p !== null ){
		//add master name
		var u = yield modelUser.$find(p.master_id);
		if( u !== null ){
			p.master_name = u.name;
		}

		//add creator name
		if( p.master_id !== p.creator_id ){
			u = yield modelUser.$find(p.creator_id);
			if( u !== null ){
				p.creator_name = u.name;
			}
		}else{
			p.creator_name = p.master_name;
		}

		//add groups and members
		p.groups = yield modelGroup.$findAll({
			select: '*',
			where: '`project_id`=?',
			params: [id]
		});
		sql = 'select m.*, u.`name`,u.`email` from project_member as m, users as u where m.user_id = u.id and m.project_id=?';
		p.members = yield warp.$query(sql, [id]);
	}
	return p || {};
}

var statusOptions = [
	{value:'planning', title:'筹备中'},
	{value:'running', title:'正在执行'},
	{value:'pending', title:'挂起'},
	{value:'cancel', title:'取消'},
	{value:'end', title:'结束'},
];
function project_optionStatus(){
	return statusOptions;
}

var roleOptions = [
	{ value: 'leader', title: '负责人'},
	{ value: 'manager', title: '管理兼执行'},
	{ value: 'executor', title: '执行成员'}
];
function project_optionRole(){
	return roleOptions;
}

function getRoleName(v){
	for(var i = 0; i < roleOptions.length; i++ ){
		var r = roleOptions[i];
		if( r.value === v){
			return r.title;
		}
	}
	return '';
}

function* $project_getMembers(id){
	var sql = 'select m.*, u.`name` from project_member as m, users as u where m.user_id = u.id and m.project_id=?';
	return yield warp.$query(sql, [id]);
}

/* list all users, who has been not in the project */
function* $project_listOptionalUsers(id){
	var alls = yield team_base.member.$getUsers(),
		members = yield $project_getMembers(id), 
		ids = [], target = [];
	members.forEach(function(m){
		ids.push(m.user_id);
	});
	alls.forEach(function(u){
		if( ids.indexOf(u.id) === -1 ){
			target.push(u);
		}
	})
	return target;
}

function* $project_listTasks(id){
	/*var sql = 'select t.*, u.name as executor_name from project_task as t , users as u where t.executor_id = u.id and t.project_id=?';
	return yield warp.$query(sql, [id]);*/
	return yield modelTask.$findAll({
		select: '*',
		where: '`project_id`=?',
		order: '`order` asc',
		params: [id]
	});
}

function* $project_listTaskRelies(id){
	return yield modelTaskRely.$findAll({
		select: '*',
		where: '`project_id`=?',
		params: [id]
	})
}

function* $project_changeMaster(project_id, new_uid){
	var m = yield modelMember.$find({
		select: '*',
		where: '`project_id`=? and `group_id`=?',
		params: [project_id, MASTER_GROUP]
	});
	if( m ){
		m.user_id = new_uid;
		yield m.$update(['user_id']);
	}
}

function* $task_maxOrder(project_id, parent_id){
	var sql = 'select MAX(`order`) AS maxorder from project_task where project_id=? and parent=?',
		rs = yield warp.$query( sql, [project_id, parent_id] ),
		maxorder = rs[0].maxorder;
	return maxorder === null ? -1 : maxorder;
}

function* $task_setRelies(tid, pid, relies){
	var rs = yield modelTaskRely.$findAll({
			select: '*',
			where: '`task_id`=?',
			params: [tid]
			}),
		rids = [], i;

	rs.forEach(function(r, i){
		rids.push(r.rely_task_id);
	});

	//create
	for( i = 0; i < relies.length; i++ ){
		var r = relies[i];
		if( rids.indexOf(r) === -1 ){
			var record = {
				project_id:pid,
				task_id: tid, 
				rely_task_id: r
			};
			yield modelTaskRely.$create(record);
		}
	}
	
	//delete
	for( i = 0; i < rs.length; i++ ){
		var r = rs[i];
		if( relies.indexOf(r.rely_task_id) === -1){
			yield r.$destroy();
		}
	}
}

function* $task_listRelies(id){
	var rs = yield modelTaskRely.$findAll({
		select: '*',
		where: '`task_id`=?',
		params: [id]
	}), 
	relies = [];
	rs.forEach( function(r, index) {
		relies.push(r.rely_task_id);
	});
	return relies;
}

function* $task_moveUp(id){
	var r = yield modelTask.$find(id);
	if( r.order !== 0 ){
		yield warp.$query( 'update project_task set `order`=`order`+1 where `project_id`=? and `parent`=? and `order`=?', 
				[r.project_id, r.parent, r.order-1]);
		r.order--;
		yield r.$update(['order']);
	}
}

function* $task_moveDown(id){
	var r = yield modelTask.$find(id),
		maxOrder = yield $task_maxOrder(r.project_id, r.parent);
	if( r.order !== maxOrder ){
		yield warp.$query( 'update project_task set `order`=`order`-1 where `project_id`=? and `parent`=? and `order`=?', 
				[r.project_id, r.parent, r.order+1]);
		r.order++;
		yield r.$update(['order']);
	}
}

function* $task_changeParent(task_id, parent_id, new_order ){
	var r = yield modelTask.$find(task_id);
	if( parent_id !== 'root'){
		var parent = yield modelTask.$find(parent_id);
		if( parent === null )
			return false;
	}
	if( r.parent === parent_id ){
		return true;
	}
		
	yield warp.$query( 'update project_task set `order`=`order`-1 where `project_id`=? and `parent`=? and `order`>?', 
				[r.project_id, r.parent, r.order]);
	if( new_order !== undefined ){
		yield warp.$query( 'update project_task set `order`=`order`+1 where `project_id`=? and `parent`=? and `order`>=?', 
				[r.project_id, parent_id, new_order]);
		r.order = new_order;
	}else{
		var maxOrder = yield $task_maxOrder(r.project_id, parent_id);
		r.order = maxOrder + 1;
	}	
	r.parent = parent_id;
	yield r.$update(['parent', 'order']);
	return true;
}

function* $task_listExecutingOfUser(uid){
	/*var rs = yield modelTask.$findAll({
			select: '*',
			where: '`executor_id`=? and `status`=?',
			params: [uid, 'doing']
		});*/
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id  LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.executor_id =? and ( t.status=? or t.status=? ) order by t.plan_end_time asc';
	var rs = yield warp.$query(sql, [uid, 'doing', 'commit']);
	return rs;
}

function* $task_listQueueOfUser(uid){
	/*var rs = yield modelTask.$findAll({
			select: '*',
			where: '`executor_id`=? and `status`=?',
			params: [uid, 'doing']
		});*/
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ ' left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ ' where t.executor_id =? and ( t.status=? or t.status=? or t.status=?) and t.plan_duration>0 order by t.plan_end_time asc';
	var rs = yield warp.$query(sql, [uid, 'created', 'clear', 'pending']);
	return rs;
}

function* $task_listManageOfUser(uid){
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ ' left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ ' where t.manager_id =? and t.closed=? and t.plan_duration>0 order by t.plan_end_time asc';
	var rs = yield warp.$query(sql, [uid, false]);
	return rs;
}

function* $task_listFlow(task_id){
	return yield modelTaskFlow.$findAll({
		select: '*',
		where: '`task_id`=?',
		params: [task_id]
	});
}

//created,doing, pending, cancel, commit, completed
var statusFlow = {
	created: {
		confirm: 'clear',
		cancel: 'cancel'
	},
	clear: {
		accept: 'doing',
		cancel: 'cancel'
	},/*
	understood: {
		accept: 'doing',
		cancel: 'cancel'
	},*/
	doing: {
		commit: 'commit',
		pause: 'pending',
		cancel: 'cancel'
	},
	commit: {
		complete: 'completed',
		reopen: 'doing'
	},
	pending: {
		resume: 'doing',
		cancel: 'cancel'
	}
};

function* $task_nextFlow(task, action){
	if( statusFlow.hasOwnProperty(task.status)){
		var as = statusFlow[task.status];
		if( as.hasOwnProperty(action)){
			var cols = ['status'];
			task.status = as[action];
			if( task.status === 'completed' || task.status === 'cancel'){
				task.closed = true;
				cols.push('closed');
			}
			yield task.$update(cols);
		}
	}
}

function* $task_get(tid){
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id  LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.id =? ';
	var rs = yield warp.$query(sql, [tid]);
	var task = rs[0];
	if( task !== null ){
		var relies = yield $task_listRelies(tid) || [];
		task.rely = relies;
	}
	return task || {};
}

function* $task_listDaily(tid){
	var sql = 'select d.*, u.`name` as user_name from project_daily as d left JOIN users as u on u.id=d.user_id '
		+ 'where d.task_id =? order by d.time desc ';
	return yield warp.$query(sql, [tid]);
}

function* $task_listHistoryManageOfUser(uid, offset, limit){
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ ' left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ ' where t.manager_id =? and t.closed=? order by t.end_time desc limit ? offset ?';
	var rs = yield warp.$query(sql, [uid, true, limit, offset]);
	return rs;
}

function* $task_countHistoryManageOfUser(uid){
	return yield modelTask.$findNumber( {
				select: 'count(*)',
				where: '`manager_id`=? and `closed`=?',
				params: [uid, true]
			});
}

function* $task_listHistoryExecuteOfUser(uid, offset, limit){
	var sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
		+ ' left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ ' where t.executor_id =? and t.closed=? order by t.end_time desc limit ? offset ?';
	var rs = yield warp.$query(sql, [uid, true, limit, offset]);
	return rs;
}

function* $task_countHistoryExecuteOfUser(uid){
	return yield modelTask.$findNumber( {
				select: 'count(*)',
				where: '`executor_id`=? and `closed`=?',
				params: [uid, true]
			});
}

var _taskStatusMap = {
	created: '待需求确认',
	clear: '待接收执行',
	doing: '正在执行',
	pending: '已暂停执行',
	cancel: '已取消', 
	commit: '已提交',
	completed: '已完成'
};

var _difficulties = [ '简单', '普通', '困难'];

function* $task_sendNoticeEmail( task_id, title, recipient_list, other ){
	var t = yield $task_get( task_id ),
		m = {},
		renderHtml, i, addresses = '',
		recipient = !!recipient_list ? recipient_list : [ t.executor_id ];
	
	m.name = t.name;
	m.manager_name = t.manager_name;
	m.executor_name = t.executor_name;
	m.status = _taskStatusMap[t.status];
	m.plan_duration = t.plan_duration + '小时';
	m.difficulty = t.difficulty === 99 ? '无需执行': _difficulties[t.difficulty];
	m.plan_start_time = helper.formatDate( t.plan_start_time );
	m.plan_end_time = helper.formatDate( t.plan_end_time );;
	m.details = t.details;
	m.others = !!other ? other : '无';
	
	for( i = 0; i < recipient.length; i++ ){
		var u = yield modelUser.$find( recipient[i] );
		if( i == 0 ){
			addresses = u.email;
		}else{
			addresses += ',' + u.email;
		}
	}
	renderHtml = swig.renderFile( __base + 'view/project/task/task_info.html', m );
	smtp.sendHtml(null, addresses, title, renderHtml );
}

function* $group_getMembers(id){
	var sql = 'select m.*, u.`name` from project_member as m, users as u where m.user_id = u.id and m.group_id=?';
	return yield warp.$query(sql, [id]);
}

function* $group_get(id){
	var g = yield modelGroup.$find(id);
	if( g !== null ){
		var members = yield $group_getMembers(id);
		g.members = members;
		members.forEach(function(m){
			m.role_name = getRoleName(m.role);
		});
	}
	return g || {};
}

function* $daily_listUser(user_id, dateTime){
	var begin_time = helper.getDateTimeAt0(dateTime),
		end_time = helper.getNextDateTime(dateTime),
		yes_time = helper.getPreviousDateTime(dateTime),
		sql = 'select t.*, u.`name` as manager_name, e.name as executor_name, p.name as project_name from project_task as t '
			+ 'left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id left JOIN project as p on p.id=t.project_id '
			+ 'where t.executor_id=? and t.start_time<>0 and t.start_time<? and (t.end_time>=? or t.end_time=0)',
		ts, ds, os, i, j, dls=[];

	ts = yield warp.$query(sql, [user_id, end_time, begin_time]);
	ds = yield modelDaily.$findAll({
		select: '*',
		where: '`user_id`=? and `time` >=? and `time`<?',
		params: [user_id, begin_time, end_time]
	});
	os = yield modelDaily.$findAll({
		select: '*',
		where: '`user_id`=? and `time` >=? and `time`<?',
		params: [user_id, yes_time, begin_time]
	});

	var yesDate = new Date(yes_time);
	for( i = 0;  os.length === 0 && i < 14; i++ ){		
		yesDate.adjust( Date.DAY,   -1 );
		os = yield modelDaily.$findAll({
			select: '*',
			where: '`user_id`=? and `time` >=? and `time`<?',
			params: [user_id, yesDate.getTime(), begin_time]
		});
	}

	for( i = 0; i < ts.length; i++ ){
		var task = ts[i];
		task.daily = {};
		for( j = 0; j < ds.length; j++ ){
			if( ds[j].task_id === task.id ){
				task.daily = ds[j];
				break;
			}
		}
		for( j = 0; j < os.length; j++ ){
			if( os[j].task_id === task.id ){
				task.daily.org_plan = os[j].plan;
				break;
			}
		}
		if( task.status === 'pending' && Object.keys(task.daily).length === 0 ){
			continue;
		}
		dls.push( task );
	}
	return dls;
}

function* $daily_listUserByMonth( uid, year, month ){
	var begin_day = new Date( year, month, 1),
	    begin_time = begin_day.getTime(),
	    end_day = helper.getLastDayOfMonth( year, month ),
		end_time = end_day.getTime(),
		sql = 'select d.*, p.`name` as project_name, t.name as task_name from project_daily as d '
			+ 'left JOIN project as p on p.id=d.project_id left JOIN project_task as t on t.id=d.task_id where d.user_id=? and d.time>=? and d.time<=? order by d.time asc';
	return yield warp.$query(sql, [uid, begin_time, end_time]);
}

function* $daily_listProject(project_id, dateTime){
	var begin_time = helper.getDateTimeAt0(dateTime),
		end_time = helper.getNextDateTime(dateTime),
		yes_time = helper.getPreviousDateTime(dateTime),
		sql = 'select t.*, u.`name` as manager_name, e.name as executor_name from project_task as t '
			+ 'left JOIN users as u on u.id=t.manager_id left JOIN users as e on e.id=t.executor_id where t.project_id=? and t.start_time<>0 and t.start_time<? and (t.end_time>=? or t.end_time=0)',
		ts, ds, os, i, j;

	ts = yield warp.$query(sql, [project_id, end_time, begin_time]);
	ds = yield modelDaily.$findAll({
		select: '*',
		where: '`project_id`=? and `time` >=? and `time`<?',
		params: [project_id, begin_time, end_time]
	});
	os = yield modelDaily.$findAll({
		select: '*',
		where: '`project_id`=? and `time` >=? and `time`<?',
		params: [project_id, yes_time, begin_time]
	});

	for( i = 0; i < ts.length; i++ ){
		var task = ts[i];
		task.daily = {};
		for( j = 0; j < ds.length; j++ ){
			if( ds[j].task_id === task.id ){
				task.daily = ds[j];
				break;
			}
		}
		for( j = 0; j < os.length; j++ ){
			if( os[j].task_id === task.id ){
				task.daily.org_plan = os[j].plan;
				break;
			}
		}
	}
	return ts;
}

function* $user_isProjectMaster(uid, project_id){
	var r = yield modelProject.$find(project_id);
	if( r && r.master_id === uid ){
		return true;
	}
	return false;
}

function* $user_havePermEditProject(context, project_id){
	var managers = ['leader', 'manager'];
	var uid = context.request.user.id, 
		r = yield modelMember.$find({
			select: '*',
			where: '`user_id`=? and `project_id`=?',
			params: [uid, project_id]
		});

	if( r && managers.indexOf(r.role) !== -1 ){
		return true;
	}
	if( yield $user_isProjectMaster(uid, project_id)){
		return true;
	}
	log.debug('User %s has no permission for project edit', context.request.user.username);
	return false;
}




module.exports = {

	modelProject: modelProject,
	modelGroup: modelGroup,
	modelMember: modelMember,
	modelTask: modelTask,
	modelTaskRely: modelTaskRely,
	modelTaskFlow: modelTaskFlow,
	modelDaily: modelDaily,

	$render: $_render,
	setHistoryUrl: setHistoryUrl,
	getHistoryUrl: getHistoryUrl,
	validate: json_schema.validate,


	config: {
		PAGE_SIZE: config.project.page_size,
		MASTER_GROUP: MASTER_GROUP,
		PERM_CREATE_PROJECT: team_base.PERM_CREATE_PROJECT
	},

	project: {
		$list: $project_list,
		$count: $project_count,
		$destroy:$project_delete,
		$listAllOnRun: $project_listAllOnRun,
		$listAllOnEnd: $project_listAllOnEnd,
		$listUserJoinOnRun: $project_listUserJoinOnRun,
		$listUserJoinOnEnd: $project_listUserJoinOnEnd,
		$get: $project_get,
		statusOptions: project_optionStatus,
		roleOptions: project_optionRole,
		$listOptionalUsers: $project_listOptionalUsers,
		$listTasks : $project_listTasks,
		$listTaskRelies: $project_listTaskRelies,
		$countAllOnRun: $project_countAllOnRun,
		$countAllOnEnd: $project_countAllOnEnd,
		$countUserJoinOnRun: $project_countUserJoinOnRun,
		$countUserJoinOnEnd: $project_countUserJoinOnEnd,
		$changeMaster: $project_changeMaster
	},

	group: {
		$getMembers: $group_getMembers,
		$get: $group_get		
	},

	task: {
		$maxOrder: $task_maxOrder,
		$setRelies: $task_setRelies,
		$listRelies: $task_listRelies,
		$moveUp: $task_moveUp,
		$moveDown: $task_moveDown,
		$changeParent: $task_changeParent,
		$listExecutingOfUser: $task_listExecutingOfUser,
		$listManageOfUser: $task_listManageOfUser,
		$listQueueOfUser: $task_listQueueOfUser,
		$listFlow: $task_listFlow,
		$nextFlow: $task_nextFlow,
		$listDaily: $task_listDaily,
		$get: $task_get,
		$listHistoryManageOfUser: $task_listHistoryManageOfUser,
		$countHistoryManageOfUser: $task_countHistoryManageOfUser,
		$listHistoryExecuteOfUser: $task_listHistoryExecuteOfUser,
		$countHistoryExecuteOfUser: $task_countHistoryExecuteOfUser,
		$sendNoticeEmail: $task_sendNoticeEmail
	},

	daily: {
		$listUser: $daily_listUser,
		$listProject: $daily_listProject,
		$listUserByMonth: $daily_listUserByMonth
	},

	user: {
		$list: team_base.member.$getUsers,
		$havePermEditProject: $user_havePermEditProject,
		$isProjectMaster: $user_isProjectMaster,
		$havePerm: team_base.$havePerm,
		$testPerm: team_base.$testPerm,
		$isAdmin: team_base.member.$isAdmin
	}
	
};


