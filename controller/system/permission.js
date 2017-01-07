'use strict';

var 
	db = require( __base + 'lib/db'),
	sys_cache = require('./sys_cache');

var 
	modelRole = db.role,
	modelPerm = db.permission,
	modelRolePerm = db.map_role_permission,
	modelUserRole = db.map_user_role,
	next_id = db.next_id,
	warp = db.warp;

function* $perm_register( name, brief ){
	var p = yield modelPerm.$find({
				select: '*',
				where: '`name`=?',
				params: [name]
			});
	if( p === null ){
		p = {
			id: next_id(),
			name: name,
			brief: brief
		}
		yield modelPerm.$create(p);
	}
	return p.id;
}

function* $role_register(name, details){
	var r = yield modelRole.$find({
				select: '*',
				where: '`name`=?',
				params: [name]
			});
	if( r === null ){
		r = {
			id: next_id(),
			name: name,
			details: details
		}
		yield modelRole.$create(r);
	}
	return r.id;
}

function* $role_registerPerm(rid, pid ){
	var r = yield modelRolePerm.$find({
				select: '*',
				where: '`role_id`=? and `permission_id`=?',
				params: [rid, pid]
			});
	if( r === null ){
		r = {
			id: next_id(),
			role_id: rid,
			permission_id: pid
		}
		yield modelRolePerm.$create(r);
	}
	return r.id;
}

function* $role_list(){
	return yield modelRole.$findAll();
}

function* $user_listPerms(uid){
	return yield sys_cache.user.$getPerms(uid);
}

function* $user_listRoles(uid){
	var sql = 'select r.* from sys_role as r left join sys_map_user_role as mur on mur.role_id=r.id where mur.user_id=?';
	return yield warp.$query(sql, [uid]);
}

function* $_user_removeRole(uid, rid){
	var r = yield modelUserRole.$find({
		select: '*',
		where: '`user_id`=? and `role_id`=?',
		params: [uid, rid]
	});
	if( r !== null ){
		yield r.$destroy();
	}
}

function* $user_setRoles(uid, roles){
	var old_rs = yield $user_listRoles(uid),
		i, r, old_roles=[], changed = false;;

	for( i = 0; i < old_rs.length; i++ ){
		old_roles.push( old_rs[i].id)
	}
	for( i = 0; i < roles.length; i++ ){
		r = roles[i];
		if( old_roles.indexOf(r) === -1 ){
			var o = {
				user_id: uid,
				role_id: r
			};
			yield modelUserRole.$create(o);
			changed = true;
		}
	}
	for( i = 0; i < old_rs.length; i++ ){
		r = old_rs[i];
		if( roles.indexOf(r.id) === -1 ){
			yield $_user_removeRole(uid, r.id);
			changed = true;
		}
	}

	if( changed ){
		yield sys_cache.user.$flushPerms(uid);
	}
}

function* $user_havePerm(uid, perm_name){
	var ps = yield $user_listPerms(uid);
	return ps.hasOwnProperty(perm_name);
}

module.exports = {
	perm: {
		$register: $perm_register
	},
	role: {
		$register: $role_register,
		$registerPerm: $role_registerPerm,
		$list: $role_list
	},
	user: {
		$listPerms: $user_listPerms,
		$listRoles: $user_listRoles,
		$setRoles: $user_setRoles,
		$havePerm: $user_havePerm
	}
};