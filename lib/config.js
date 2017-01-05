'use strict';

/**

read config files:
  * config_default.js
  * config_production.js if in production mode and file exist

You should override some configurations in your own 'config_production.js', e.g.:

    // config_production.js:
    exports = module.exports = {
        "db": {
            "host": "192.168.0.101", // a specific IP of mysql server
            "port": 3307 // a specific port of mysql server
        }
    }

**/

var
	_ = require("lodash"),
	fs = require("fs"),
	cfg = require("./config_default");

if( process.productionMode ){
	if( fs.existsSync( __base + "config_production.js")){
		console.log( 'loading config_production...');
		var ovr = require( __base +'config_production');
		cfg = _.merge(cfg, ovr);
	}else{
		console.warn('config_production.js not found!');
        throw 'config_production.js not found when running in production mode!';
	}
}else{
	if (fs.existsSync( __base + 'config_development.js')) {
        console.log('loading config_development...');
        var ovr = require( __base +'config_development');
        cfg = _.merge(cfg, ovr);
    }
    else {
        console.warn('config_development.js not found!');
    }
}

cfg.version = '1.0';
// replace by deployment:
cfg.build = '$BUILD$';

console.log('configuration loaded:');
console.log( JSON.stringify(cfg, null, '  '));

module.exports = cfg;