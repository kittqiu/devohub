'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'ProjectDaily', [
		base.column_id('project_id', {index:true}),
		base.column_id('task_id', {index:true}),
		base.column_id('user_id', {index:true}),
		base.column_bigint('duration', {defaultValue:0}),//hour
		base.column_bigint('time', {index:true, defaultValue:0}),
		base.column_varchar_500('report',{defaultValue:''}),
		base.column_varchar_500('plan',{defaultValue:''}),
		], {
			table: 'project_daily',
			no_column_version: true
		});
};