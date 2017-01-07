'use strict';

var base = require('../_base');

/* 1:n */
module.exports = function(warp){
	return base.defineModel(warp, 'ProjectTaskRely', [
		base.column_id('project_id', {index:true}),
		base.column_id('task_id', {index:true}),
		base.column_id('rely_task_id', {index:true})
		], {
			table: 'project_task_rely',
			no_column_version: true
		});
};