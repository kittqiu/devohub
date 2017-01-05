'use strict';

//user.js

var constants = require(__base+'lib/constants');
var base = require('../_base');

module.exports = function(warp){
	return base.defineModel( warp, 'User', [
		base.column_bigint( 'role', { defaultValue: constants.role.DEVELOPER}),
		base.column_varchar_100( 'username', { unique: true }),
		base.column_varchar_100( 'name'),
		base.column_varchar_100( 'email', { unique: true, validate:{ isEmail: true, isLowerCase: true}}),
		base.column_boolean( 'verified'),
		base.column_boolean( 'actived', {defaultValue:true}),
		base.column_varchar_1000( 'image_url' ),
		base.column_bigint( 'locked_until')
		], {
			table: 'users'
		})
};
