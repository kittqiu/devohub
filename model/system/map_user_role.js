'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'SysMapUserRole', [
		base.column_id('user_id', {index:true}),
		base.column_id('role_id'),
		], {
			table: 'sys_map_user_role',
			no_column_version: true
		});
};