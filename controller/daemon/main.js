'use strict';

var 
	co = require('co'), 
	schedule = require('node-schedule'),
	log = require(__base+'lib/logger'),
	team_cache = require( __base + 'controller/team/team_cache');

var tasks_at_8 = [
	'./job/task_team',
	'./job/task_project'
	];

function onerror(err) {  
	log.error(err.stack);
}

function* runJobs( tasks ){
	var i, task;
	for( i = 0; i < tasks.length; i++ ){
		try{
			task = require(tasks[i]);
			yield task.$execute();
		}catch(err){
			log.error(err.stack);
		}
		
	}
}

function* runjobAt8(){
	yield runJobs( tasks_at_8 );
}

function* runjobEveryMinute(){
	yield team_cache.$tryReload()
}

function MODULE_Main(){
	
	var j8 = schedule.scheduleJob( "runjobAt8", {hour:8, minute:1}, function(){
		log.debug("runjobAt8 is running...");
		co( runjobAt8 ).catch(onerror);
	});

	var jm = schedule.scheduleJob( "* * * * *", function(){
		log.debug("runjobEveryMinute is running...");
		co( runjobEveryMinute ).catch(onerror);
	});
}

MODULE_Main();

module.exports = {

};