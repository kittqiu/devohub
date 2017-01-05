'use strict';

// init mysql-warp and expose all models under dir 'models':

console.log('init mysql with mysql-warp...');

var
	_ = require('lodash'),
	fs = require('fs'),
	Warp = require('mysql-warp'),
	thunkify = require('thunkify'),
	next_id = require( __base +'model/_id'),
	config = require( './config'),
	log = require( './logger'),	
	op = require( __base + 'model/_operate');

// init database:
var warp = Warp.create(config.db);

warp.$transaction = thunkify(warp.transaction);
warp.$query = thunkify(warp.query);
warp.$queryNumber = thunkify(warp.queryNumber);
warp.$update = thunkify(warp.update);



function* $_update(array){
	if( array.indexOf('updated_at') === -1 && this.hasOwnProperty('updated_at')){
		array.push( 'updated_at' );
	}
	if( array.indexOf('version') === -1 && this.hasOwnProperty('version')){
		array.push( 'version' );
	}
	yield this.$updateOrg( array );
}

var baseModel = warp.__model;
baseModel.$find = thunkify(baseModel.find);
baseModel.$findAll = thunkify(baseModel.findAll);
baseModel.$findNumber = thunkify(baseModel.findNumber);
baseModel.$create = thunkify(baseModel.create);
baseModel.$update = $_update;
baseModel.$updateOrg = thunkify(baseModel.update);
baseModel.$destroy = thunkify(baseModel.destroy);



// export warp and all model objects:
var dict = {
    warp: warp,
    next_id: next_id,
    op: {
    	$update_record: op.$updateRecord
    }
};

var MODELPATHS = [
	'./model',
	'./model/system'/*,
	'./model/team',
	'./model/project',
	'./model/train'*/
];

function loadModels( relativepath ){
	// load all models:
	var files = fs.readdirSync( __base + relativepath);
	var re = new RegExp("^[A-Za-z][A-Za-z0-9\\_]*\\.js$");

	var models = _.map(_.filter(files, function (f) {
	    return re.test(f);
	}), function (fname) {
	    return fname.substring(0, fname.length - 3);
	});

	_.each( models, function( modelName ){
		log.debug('found model: ' + modelName);
		var model = require( __base + relativepath + '/' + modelName)(warp);
		// thunkify all database operations:
		_.each( ['find', 'findAll', 'findNumber', 'create', 'update', 'destroy'], function(key){
			model['$'+key] = thunkify(model[key]);
		});
		dict[modelName] = model;
	});
}


_.each( MODELPATHS, function(path){
	loadModels(path);
});

module.exports = dict;