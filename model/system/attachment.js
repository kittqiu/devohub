'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'Attachment', [
		base.column_bigint('refer'),
		base.column_varchar_100('name'),
		base.column_varchar_100('brief', {defaultValue:''}),
		base.column_varchar_500('path')
		], {
			table: 'attachment'
		});
};