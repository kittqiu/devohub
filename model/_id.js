'use strict';

/**
 * the ID generator always generates 50-chars string:
 *
 * var next_id = require('_id');
 * var the_id = next_id();
 */

var util = require("util");
var uuid = require("node-uuid");

var i, padding = [];
for( i = 1; i < 30; i++ ){
	padding.push( new Array(i).join('0'));
}

/**
 * a id-generate function that generate 50-chars id string with:
 *   current timestamp;
 *   random uuid;
 *   server shard number (0 ~ 0xff, default to 0).
 */
 module.exports = function(){
 	var id = util.format( "%d%s000", Date.now(), uuid.v4().replace(/\-/g, ''));
 	return padding[ 50 - id.length ] + id;
 }