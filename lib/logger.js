'use strict'

/**
 * 日志对象
 */
var
	config = require('./config');

/* 调试等级 */
var 
	ERROR_LEVEL = 1,		//错误事件，不影响系统的继续运行
	WARN_LEVEL = 2,			//会出现潜在错误或告警事件	
	INFO_LEVEL = 6,			//粗粒度信息事件，表示应用程序的运行过程。
	DEBUG_LEVEL = 7,		//细粒度信息事件，有助于调试应用程序。
	level = config.log.level;



/*调试等级输出*/
function _debug( data ){
	if( level >= DEBUG_LEVEL ){
		if( arguments.length == 1 )
			console.log( '[%s]-[DEBUG]: %s', new Date().toISOString(), data );
		else
			console.log.apply(console, ['[%s]-[DEBUG]: '+arguments[0], new Date().toISOString()].concat(Array.prototype.slice.call(arguments, 1)));
	}
}

/*info等级输出*/
function _info( data ){
	if( level >= INFO_LEVEL ){
		if( arguments.length == 1 )
			console.log( '[%s]-[INFO]: %s', new Date().toISOString(), data );
		else
			console.log.apply(console, ['[%s]-[INFO]: '+arguments[0], new Date().toISOString()].concat(Array.prototype.slice.call(arguments, 1)));
	}
}

/*警告等级输出*/
function _warning( data ){
	if( level >= WARN_LEVEL ){
		if( arguments.length == 1 )
			console.warn( '[%s]-[WARN]: %s', new Date().toISOString(), data );
		else
			console.warn.apply(console, ['[%s]-[WARN]: '+arguments[0], new Date().toISOString()].concat(Array.prototype.slice.call(arguments, 1)));
	}
}

/*错误等级输出*/
function _error( data ){
	if( level >= ERROR_LEVEL ){
		if( arguments.length == 1 )
			console.error( '[%s]-[ERROR]: %s', new Date().toISOString(), data );
		else
			console.error.apply(console, ['[%s]-[ERROR]: '+arguments[0], new Date().toISOString()].concat(Array.prototype.slice.call(arguments, 1)));
	}
}

/*打印JSON对象*/
function _logJSON(name, data){
	if(data){
		_debug( name + ':' );
		_debug( JSON.stringify(data, function(key, value){
			if( key === 'image' && value ){
				return value.substring(0,20) + ' (' + value.length + ' bytes image data) ...';
			}
			return value;
		}));
	}else{
		_debug('%s-(EMPTY Object)', name);
	}
}

module.exports = {
	debug: _debug,
	info: _info,
	warn: _warning,
	error: _error,

	logJSON: _logJSON
};
