'use strict';

var 
	_ = require('lodash'),
	fs = require('fs'),	
    config = require( __base + 'lib/config'),
    db = require( __base + 'lib/db'),
    api = require( __base + 'lib/api'), 
    json_schema = require( __base + 'lib/json_schema'),
    helper = require( __base + 'lib/helper'),
    co = require('co'), 
    home = require( __base + 'controller/home'),
    perm = require( __base + 'controller/system/permission');


var 
	modelUser = db.user,
	warp = db.warp,
    next_id = db.next_id;


var 
	DEFAULT_EXPIRES_IN_MS = 1000 * config.session.expires;

function setHistoryUrl( context, url ){
    if( arguments.length === 1){
        url = context.request.url;
    }
    context.cookies.set( 'MANAGE_HISTORYURL', url, {
        path: '/',
        httpOnly: true,
        expires: new Date(Date.now()+DEFAULT_EXPIRES_IN_MS)
    });
}

function getHistoryUrl( context ){
    var url = context.cookies.get('MANAGE_HISTORYURL');
    return url || '/manage/';
}

module.exports = {
    setHistoryUrl: setHistoryUrl,
    getHistoryUrl: getHistoryUrl,
    perm: perm
};