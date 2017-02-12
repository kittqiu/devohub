'use strict';
var 
	base = require( '../base'),
	db = require( __base + 'lib/db'), 
	config = require( __base + 'lib/config'),
	team_base = require( __base + 'controller/team/base'),
	swig = require('swig'),
	smtp = require( __base + 'controller/system/email');


var User = db.user;

function* $remindWorkEvaluation(){
	var i;
	if( (yield base.$isLastWorkDayByOffset( config.job.reminder_work_evaluation )) ){
		var users = yield team_base.member.$getUsers( false ),
			now = new Date();
		for( i = 0; i < users.length; i++ ){
			var u = users[i];
			var vo = yield team_base.evaluation.$get( u.id, now.getFullYear(), now.getMonth());
			if( !vo.hasOwnProperty('id')){
				var user = yield User.$find(u.id); 
				smtp.sendHtml(null, user.email, "记得填写月工作自我评价", "如题" );
			}
		}
	}

	if( yield base.$isLastWorkDayByOffset( config.job.reminder_month_kpi ) ){
		var managers = config.team.manager_list;
		for( i = 0; i < managers.length; i++ ){
			smtp.sendHtml(null, managers[i], "记得完成成员月考核和月总结", "如题" );
		}
	}
}

function* $_execute(){
	yield $remindWorkEvaluation();
}

module.exports = {
	$execute: $_execute
};
