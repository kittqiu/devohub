'use strict';

// home.js

var 
	config = require(__base + 'lib/config');

var 
	THEME = config.theme,
	PRODUCTION = process.productionMode;


function getView(view){
	return '' + view;
}

function* $getModel(model){
	model.__production__ = PRODUCTION;
	model.__salt__ = config.security.salt;
	return model;
}


module.exports = {
	$getModel: $getModel,

	'GET /': function* (){
		var model = {};
		this.redirect( config.home );
	},
	'GET /signup': function* (){
		var model = { __salt__:  config.security.salt };
		this.render( getView('system/signup.html'), yield $getModel.apply(this, [model]) );
	},
	'GET /login': function* (){
		var model = { __salt__:  config.security.salt };
		this.render( getView('system/login.html'), yield $getModel.apply(this, [model]) );
	},
	'GET /help': function* (){
		this.render( getView('system/pdfviewer.html'), {} );
	}
};
