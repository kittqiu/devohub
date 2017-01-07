'use strict';

var 
	_ = require('lodash'),
	cache = require(__base+'lib/cache'),
	db = require( __base + 'lib/db');

var 
	warp = db.warp;

var
	CACHE_PREFIX = 'sys/';

function _cache_getKey_UserPerm(uid){
	return CACHE_PREFIX + 'user/' + uid + '/perms';
}


function* $user_getPerms(uid){
	return yield cache.$get( _cache_getKey_UserPerm(uid), 
				function*(){
					var sql = 'select p.* from sys_permission as p INNER JOIN sys_map_role_permission as mrp on mrp.permission_id=p.id '
							+ ' WHERE mrp.role_id in ( select mur.role_id from sys_map_user_role as mur where mur.user_id=?)',
						rs = yield warp.$query(sql, [uid]),
						ps = {}, i;
					for( i = 0; i < rs.length; i++ ){
						var r = rs[i];
						ps[r.name] = r;
					}
					return ps;
				});
}

function* $user_flushPerms(uid){
	yield cache.$remove( _cache_getKey_UserPerm(uid) );
	yield $user_getPerms(uid);
}


module.exports = {
	user: {
		$getPerms: $user_getPerms,
		$flushPerms: $user_flushPerms
	}
}