'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'SysRole', [
		base.column_varchar_50('name'),
		base.column_varchar_500('details', {defaultValue:''})
		], {
			table: 'sys_role',
			no_column_version: true
		});
};