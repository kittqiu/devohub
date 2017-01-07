'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'ProjectMemberGroup', [
		base.column_id('project_id', {index:true}),
		base.column_varchar_50('name', {defaultValue:'software'})//'software', 'hardware', 'support'
		], {
			table: 'project_member_group',
			no_column_version: true
		});
};