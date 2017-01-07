'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'ProjectMember', [
		base.column_id('project_id', {index:true}),
		base.column_id('user_id', {index:true}),
		base.column_id('group_id'),//manager or id
		base.column_varchar_100('responsibility', {defaultValue:''}),
		base.column_varchar_20('role', {defaultValue:'executor'}),//'executor', 'leader', 'manager', 'master'
		base.column_bigint('time_cost', {defaultValue:0}),//mininus
		base.column_bigint('score', {defaultValue:0})
		], {
			table: 'project_member',
			no_column_version: true
		});
};