'use strict';

var base = require('../_base');

module.exports = function(warp){
	return base.defineModel(warp, 'EmailAuth', [
		base.column_id('user_id', {unique: true}),
		base.column_bigint('expired')
		], {
			table: 'sys_email_auth'
		});
};