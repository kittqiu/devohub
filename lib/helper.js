'use strict';

var 
	api = require( './api');

// for safe base64 replacements:
var
	re_add = new RegExp(/\+/g),
	re_sla = new RegExp(/\//g),
	re_equ = new RegExp(/\=/g),
	re_r_add = new RegExp(/\-/g),
	re_r_sla = new RegExp(/\_/g),
	re_r_equ = new RegExp(/\./g);

// string -> base64:
function _safe_b64encode(s) {
	var b64 = new Buffer(s).toString('base64');
	return b64.replace(re_add, '-').replace(re_sla, '_').replace(re_equ, '.');
}

// base64 -> string
function _safe_b64decode(s) {
	var b64 = s.replace(re_r_add, '+').replace(re_r_sla, '/').replace(re_r_equ, '=');
	return new Buffer(b64, 'base64').toString();
}

var re_int = /^[0-9]+$/;

function string2Integer(s) {
	if (re_int.test(s)) {
		return parseInt(s, 10);
	}
	return null;
}

function getDateTimeAt0(millisecond){    
	var n = millisecond || Date.now(),
		offset = 0,
		day = new Date(n);
	if( process.env.TZ === 'Asia/Shanghai' && day.getTimezoneOffset() !== -480){
		offset = (-480 - day.getTimezoneOffset())*60000;
		day = new Date(millisecond-offset)
	}

	day.setHours(0,0,0,0);
	//return n - (n%86400000);
	
	return day.getTime() + offset;
}

function getNextDateTime(millisecond){
	var n = millisecond || Date.now();
	//return n - (n%86400000) + 86400000;
	return getDateTimeAt0(n) + 86400000;
}

function getPreviousDateTime(millisecond){
	var n = millisecond || Date.now();
	//return n - (n%86400000) + 86400000;
	return getDateTimeAt0(n-86400000);
}


function getWeek(){
	var now = new Date(),
		onejan = new Date(now.getFullYear(), 0, 1);
	return Math.floor((((now - onejan) / 86400000) + onejan.getDay()) / 7);
}

function getFirstDayOfMonth(){
	var now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getLastDayOfMonth( year, month ){
	var now = new Date();
	var y = !!year ? year : now.getFullYear();
	var m = month === undefined ? now.getMonth() : month;
	var day = m === 11 ? new Date( y + 1, 0, 1 ) : new Date( y, m + 1, 1 );
	day.setDate(day.getDate()-1);
	return day;
}

function getFirstDayOfYear(year){
	return new Date(year, 0, 1, 0, 0, 0, 0);
}

function getLastDayOfYear(year){
	return new Date(year, 11, 31, 23, 59, 59, 999);
}

function getId(request) {
	var id = request.query.id;
	if (id && id.length === 50) {
		return id;
	}
	throw api.notFound('id');
}

function formatDate(time, withTime ){
	var date = new Date(time);
	if( withTime ){
		var dd = date.getDate(),
			mm = date.getMonth()+1,
			hour = date.getHours(),
			minute = date.getMinutes(),
			second = date.getSeconds();
		return date.getFullYear() + '-' + (mm>9?mm:'0'+mm) + '-' +  (dd>9?dd:'0'+dd)
			+ ' ' + (hour>9?hour:'0'+hour) + ':' + (minute>9?minute:'0'+minute) + ':' + (second>9?second:'0'+second);
	}
	else{
		var dd = date.getDate(),
			mm = date.getMonth()+1;
		return date.getFullYear() + '-' + (mm>9?mm:'0'+mm) + '-' + (dd>9?dd:'0'+dd);    
	}	
}

function sort_email(a,b){
	return ((a.email>b.email)?1:-1);
}

module.exports = {

	checkPermission: function( request, expectedRole ){
		if( !request.user || request.user.role > expectedRole ){
			console.log('check permission failed: expected = ' + expectedRole + ', actual = ' + (request.user ? request.user.role : 'null' ));
			throw api.notAllowed( 'No permission!');
		}
	},
	base64encode: _safe_b64encode,
	base64decode: _safe_b64decode,     

	getDateTimeAt0: getDateTimeAt0,
	getNextDateTime: getNextDateTime,
	getPreviousDateTime: getPreviousDateTime,
	getWeek: getWeek, 
	getFirstDayOfMonth: getFirstDayOfMonth,
	getLastDayOfMonth: getLastDayOfMonth,
	getFirstDayOfYear: getFirstDayOfYear,
	getLastDayOfYear: getLastDayOfYear,
	getId: getId,
	formatDate: formatDate,
	sort_email: sort_email
};