'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'SysPermission', [
		base.column_varchar_50('name', {index: true}),
		base.column_varchar_100('brief', {defaultValue:''})
		], {
			table: 'sys_permission',
			no_column_version: true
		});
};