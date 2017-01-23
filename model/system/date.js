'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'SysDate', [
		base.column_bigint('time', {index:true, defaultValue:0}),
		base.column_boolean( 'workday', {defaultValue:true})
		], {
			table: 'sys_date',
			no_column_version: true
		});
};