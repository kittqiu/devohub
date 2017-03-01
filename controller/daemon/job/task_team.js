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
	var users = yield team_base.member.$getUsers( false ),
		now = new Date(),
		i, u;
	if( (yield base.$isLastWorkDayByOffset( config.job.reminder_work_evaluation )) ){		
		for( i = 0; i < users.length; i++ ){
			u = users[i];
			var vo = yield team_base.evaluation.$get( u.id, now.getFullYear(), now.getMonth());
			if( !vo.hasOwnProperty('id')){
				smtp.sendHtml(null, u.email, "记得填写月工作自我评价", "如题。如果已完成，忽略此邮件。" );
			}
		}
	}

	if( (yield base.$isLastWorkDayByOffset( config.job.reminder_month_kpi )) ){		
		for( i = 0; i < users.length; i++ ){
			u = users[i];
			var isManager = yield team_base.member.$isManager(u.id);
			if( isManager ){
				smtp.sendHtml(null, u.email, "记得填写成员的月工作评价", "如题。如果已完成或本月不需要，忽略此邮件。" );
			}
		}
	}
}

function* $_execute(){
	yield $remindWorkEvaluation();
}

module.exports = {
	$execute: $_execute
};
