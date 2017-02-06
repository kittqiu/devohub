'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'TeamDepartmentPerm', [
		base.column_id('user', {index:true}),
		base.column_id('department')
		], {
			table: 'team_department_perm',
			no_column_version: true
		});
};