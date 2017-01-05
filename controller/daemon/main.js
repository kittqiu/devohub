'use strict';

var 
	co = require('co'), 
	schedule = require('node-schedule');

var tasks_at_8 = [
	//'./job/task_team'
	];

function onerror(err) {  
  console.error(err.stack);
}

function* runJobs( tasks ){
	var i, task;
	for( i = 0; i < tasks.length; i++ ){
		task = require(tasks[i]);
		yield task.$execute()
	}
}

function* runjobAt8(){
	yield runJobs( tasks_at_8 );
}

function MODULE_Main(){
	
	var j8 = schedule.scheduleJob( "runjobAt8", {hour:8, minute:1}, function(){
		log.debug("runjobAt8 ")
		log.debug( new Date());
		co( runjobAt8 ).catch(onerror);
	});
}

MODULE_Main();

module.exports = {

};