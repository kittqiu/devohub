'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'ProjectTaskFlowRecord', [
		base.column_id('task_id', {index:true}),
		base.column_id('user_name'),
		base.column_varchar_20('action'),//options: 确认接收、提交、完成、继续执行、挂起、取消、回复
		base.column_text('reply', {defaultValue:''})
		], {
			table: 'project_task_flow_record',
			no_column_version: true
		});
};