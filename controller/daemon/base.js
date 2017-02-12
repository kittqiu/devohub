'use strict';

var 
	sysconf = require( __base + 'controller/system/config'),
	helper = require( __base + 'lib/helper');

function* $_getLastWorkDayOfMonth( offset ){
	var i = 0,
		day = helper.getLastDayOfMonth();
	
	while( i < offset ){
		var bwork = yield sysconf.date.$isWorkDate( day.getFullYear(), day.getMonth(), day.getDate());
		if( bwork ){
			i++;
		}
		if( i < offset ){
			day.setDate(day.getDate()-1);
		}
	}
	return day;
}

function* $_isLastWorkDayByOffset( offset ){
	var day = yield $_getLastWorkDayOfMonth( offset ),
		now = new Date();
	return ( now.getFullYear() === day.getFullYear()) &&  ( now.getMonth() === day.getMonth()) && ( now.getDate() === day.getDate());
}

module.exports = {
	$getLastWorkDayOfMonth: $_getLastWorkDayOfMonth,
	$isLastWorkDayByOffset: $_isLastWorkDayByOffset
};
