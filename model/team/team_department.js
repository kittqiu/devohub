'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'TeamDepartment', [
		base.column_varchar_50('name'),
		base.column_varchar_20('type', {defautValue:'department'}),//'department', 'group'		
		base.column_id('parent'),//default: 'root'
		base.column_bigint('order'),
		base.column_text('duty')//markdown
		], {
			table: 'team_department',
			no_column_version: true
		});
};