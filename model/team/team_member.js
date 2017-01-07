'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'TeamMember', [
		base.column_id('user_id', {index:true}),
		base.column_id('department'),
		base.column_bigint('time_work'),
		base.column_bigint('time_join'),
		base.column_bigint('birthday'),
		base.column_varchar_20('card_id'),
		base.column_varchar_20('telephone'),
		base.column_varchar_20('work_number')
		], {
			table: 'team_member',
			no_column_version: true
		});
};