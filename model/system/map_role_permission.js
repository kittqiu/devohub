'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'SysMapRolePermission', [
		base.column_id('role_id', {index:true}),
		base.column_id('permission_id'),
		], {
			table: 'sys_map_role_permission',
			no_column_version: true
		});
};