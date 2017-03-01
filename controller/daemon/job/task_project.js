'use strict';
var 
	base = require( '../base'),
	db = require( __base + 'lib/db'), 
	config = require( __base + 'lib/config'),
	team_base = require( __base + 'controller/team/base'),
	swig = require('swig'),
	smtp = require( __base + 'controller/system/email'),
	sys_conf = require( __base + 'controller/system/config');


var 
	User = db.user,
	warp = db.warp,
	one_day_time = 86400000;

var _taskStatusMap = {
	created: '待需求确认',
	clear: '待接收执行',
	doing: '正在执行',
	pending: '已暂停执行',
	cancel: '已取消', 
	commit: '已提交',
	completed: '已完成'
};

/* 得到用户已超期的任务*/
function* $__getMyTaskIsOutOfDate( uid ){
	var sql = 'select t.*, u.`name` as manager_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.manager_id LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.executor_id =? and t.closed<>? and ( t.status=? and t.status=? ) and t.difficulty<>? and t.plan_end_time<=?';
	var rs = yield warp.$query(sql, [uid, true, 'doing', 'commit',99, Date.now()-one_day_time]);
	for( var i = 0; i < rs.length; i ++ ){
		var r = rs[i];
		r.status_text = _taskStatusMap[r.status];
	}
	return rs;
}

/* 得到用户管理的已超期的任务*/
function* $__getManagedTaskIsOutOfDate( uid ){
	var sql = 'select t.*, u.`name` as executor_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.manager_id =? and t.closed<>? and t.status<>? and t.difficulty<>? and t.plan_end_time<=?';
	var rs = yield warp.$query(sql, [uid, true, 'pending', 99, Date.now()-one_day_time]);
	for( var i = 0; i < rs.length; i ++ ){
		var r = rs[i];
		r.status_text = _taskStatusMap[r.status];
	}
	return rs;
}

/* 当日需要开始执行的任务 - 执行人*/
function* $__getMyTasksInTime( uid ){
	var sql = 'select t.*, u.`name` as manager_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.manager_id LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.executor_id =? and ( t.status=? or t.status=? ) and t.difficulty<>? and t.plan_start_time<=?';
	var rs = yield warp.$query(sql, [uid, 'created', 'clear', 99, Date.now()]);
	for( var i = 0; i < rs.length; i ++ ){
		var r = rs[i];
		r.status_text = _taskStatusMap[r.status];
	}
	return rs;
}

/* 当日需要执行管理的任务 - 管理者*/
function* $__getManagedTasksInTime( uid ){
	var tomorow = Date.now();
	var sql = 'select t.*, u.`name` as executor_name, p.name as project_name from project_task as t '
		+ 'left JOIN users as u on u.id=t.executor_id LEFT JOIN project as p on t.project_id=p.id '
		+ 'where t.manager_id =? and t.difficulty<>? and ( ( t.status=? and t.plan_start_time<? ) or ( t.plan_end_time<=?'
		+' and ( t.status=? or t.status=? or t.status=?) ) ) ';
	var rs = yield warp.$query(sql, [uid, 99,'created', tomorow, tomorow, 'clear', 'doing', 'commit' ]);
	for( var i = 0; i < rs.length; i ++ ){
		var r = rs[i];
		r.status_text = _taskStatusMap[r.status];
	}
	return rs;
}

/**
 * 检测所有用户，是否有任务需要执行或审核，若有，则发送提醒邮件
 */
function* $_check_all_user_tasks(){
	var users = yield team_base.member.$getUsers( false ),
		now = new Date(),
		i, u, ts, m, renderHtml;

	if( !(yield sys_conf.date.$isWorkDate( now.getFullYear(), now.getMonth(), now.getDate()))){
		return;
	}
		
	for( i = 0; i < users.length; i++ ){
		u = users[i];
		m = { ofd_mytasks:[], ofd_managed_tasks:[], it_mytasks: [], it_managed_tasks:[]};

		ts = yield $__getMyTaskIsOutOfDate( u.id );
		if( ts.length > 0 ){
			m.ofd_mytasks = ts;
		}

		ts = yield $__getManagedTaskIsOutOfDate( u.id );
		if( ts.length > 0 ){
			m.ofd_managed_tasks = ts;
		}

		ts = yield $__getMyTasksInTime( u.id );
		if( ts.length > 0 ){
			m.it_mytasks = ts;
		}

		ts = yield $__getManagedTasksInTime( u.id );
		if( ts.length > 0 ){
			m.it_managed_tasks = ts;
		}
		
		if( m.ofd_mytasks.length > 0 || m.ofd_managed_tasks.length > 0 
			|| m.it_mytasks.length > 0 || m.it_managed_tasks.length > 0 ){
			renderHtml = swig.renderFile( __base + 'view/project/task/task_notice.html', m );
			//console.log(renderHtml)
			smtp.sendHtml(null, u.email, '工作任务提醒', renderHtml );
		}
			
	}
}

function* $_execute(){
	yield $_check_all_user_tasks();
}

module.exports = {
	$execute: $_execute
};
