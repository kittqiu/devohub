'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'ProjectTask', [
		base.column_id('project_id', {index:true}),
		base.column_id('parent', {defaultValue:'root'}),
		base.column_varchar_100('name'),
		base.column_bigint('automode', {defaultValue:1}), 
		//base.column_bigint('number', {defaultValue:0}),//no in project
		base.column_bigint('order', {defaultValue:0}),//order in the same 
		//base.column_varchar_100('rely_to', {defaultValue:''}),//number list, e. 1, 5
		base.column_bigint('plan_duration', {defaultValue:0}),//hour
		base.column_bigint('duration', {defaultValue:0}),//hour
		base.column_bigint('plan_start_time', {defaultValue:0}),//validate on automode is false
		base.column_bigint('plan_end_time', {defaultValue:0}),//validate on automode is false
		base.column_bigint('difficulty', {defaultValue:0}),//0:simple, 1:general, 2: difficulte
		base.column_boolean('closed', {defaultValue:false}),		
		base.column_text('details'),
		/*executor*/
		base.column_id('executor_id', {index:true}),
		base.column_id('manager_id', {index:true}),
		base.column_bigint('start_time', {index:true, defaultValue:0}),
		base.column_bigint('end_time', {index:true, defaultValue:0}),
		base.column_bigint('percent', {defaultValue:0}),//0-100
		base.column_bigint('qulity', {defaultValue:0}),//0:bad, 1:not bad, 2: good, 3: very good
		base.column_varchar_20('status', {defaultValue:'created'})//options: created,confirm,understood,doing, pending, cancel, commit, completed
		], {
			table: 'project_task'
		});
};