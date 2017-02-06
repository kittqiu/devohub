'use strict';

var 
	_ = require('lodash'),
	cache = require(__base+'lib/cache'),
	db = require( __base + 'lib/db');

var 
	warp = db.warp,
	modelUser = db.user,
	modelDep = db.team_department,
	modelMember = db.team_member,
	modelDepPerm = db.team_department_perm;

var
	CACHE_PREFIX = 'team/',
	DEP_ROOT = 'root',
	user_map = new Map(),
	dep_map = new Map();

function __getRootDepartment( depId ){
	var dep = dep_map.get( depId );
	while( dep.parent !== DEP_ROOT ){
		dep = dep_map.get( dep.parent );
	}
	return dep;
}

function* $_buildTeamMap(){
	var 
		i,
		deps = yield modelDep.$findAll({
			select: ['id', 'name', 'parent', 'order']
		}),
		users = yield warp.$query("select u.id, u.name, m.department from users as u,team_member as m where u.id=m.user_id and m.department <>''");

	//初始化部门的映射
	dep_map.clear();
	for( i = 0; i < deps.length; i++ ){
		var d = deps[i];
		var dep_obj = { id: d.id, name: d.name, parent: d.parent, order: d.order, users: [], subdeps:[d.id]}; 
		dep_map.set( d.id, dep_obj );
	}
	for( i = 0; i < deps.length; i++ ){
		var d = deps[i];
		if( d.parent !== DEP_ROOT ){
			var root_dep = __getRootDepartment( d.id );
			root_dep.subdeps.push( d.id );
		}
	}

	//初始化用户的映射，默认用户属于自己的顶级部门
	user_map.clear();
	for( i = 0; i < users.length; i++ ){
		var u = users[i];
		var dep_root = __getRootDepartment( u.department );	
		var user_obj = { id: u.id, name: u.name, department: u.department, in_deps: [dep_root.id] };

		var dep_perms = yield modelDepPerm.$findAll({
			select: '*',
			where: '`user`=?',
			params: [u.id]
		});
		for( var j = 0; j < dep_perms.length; j++ ){
			var dep_id = dep_perms[j].department;
			if( user_obj.in_deps.indexOf( dep_id) === -1 ){
				user_obj.in_deps.push( dep_id );
			}			
		}

		user_map.set( u.id, user_obj );
		dep_root.users.push( u.id );
	}
}

function* $_MODULE_init(){
	yield $_buildTeamMap();
}

function* $_getCoworkers(uid){
	var u = user_map.get(uid);
	var us = [];
	if( u ){
		var deps = u.in_deps;
		for( var i = 0; i < deps.length; i++ ){
			var d = dep_map.get( deps[i] );
			us = us.concat( d.users );
		}
	}
	return us;
}

function* $_getCodepartments(depId){
	var d = __getRootDepartment(depId);
	return d.subdeps;
}

module.exports = {
	$init: $_MODULE_init,
	$reinit: $_MODULE_init,
	$getCoworkers: $_getCoworkers,
	$getCodepartments: $_getCodepartments
}