'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'TeamEvaluation', [
		base.column_id('user_id', {index:true}),
		base.column_id('manager_id'),
		base.column_bigint('time', {defaultValue:0,index: true}),
		base.column_text('evaluation')//json格式
		], {
			table: 'team_evaluation',
			no_column_version: true
		});
};