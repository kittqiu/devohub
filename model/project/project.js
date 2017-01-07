'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'Project', [
		base.column_id('creator_id'),
		base.column_id('master_id', {index:true}),
		base.column_varchar_50('name'),
		base.column_bigint('start_time'),
		base.column_bigint('end_time'),
		base.column_varchar_20('status', {defaultValue:'ready'}),//options: ready, running, end
		base.column_text('details')
		], {
			table: 'project'
		});
};