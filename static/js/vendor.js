function showErrorInfo(title, msg){
	var t = arguments.length == 1 ? '错误': title;
	var m = arguments.length == 1 ? title: msg;
	$.messager.show({
		title:t,
		msg:m,
		timeout: 2000,
		showType:'slide',
		style:{
			right:'',
			top:document.body.scrollTop+document.documentElement.scrollTop,
			bottom:''
		}
	});
}

function showInfo(title, msg){
	var t = arguments.length == 1 ? '提示': title;
	var m = arguments.length == 1 ? title: msg;
	$.messager.show({
		title:t,
		msg:m,
		timeout: 1000,
		showType:'slide',
		style:{
			right:'',
			top:document.body.scrollTop+document.documentElement.scrollTop,
			bottom:''
		}
	});
}

function showProgressInfo( title, msg, timeout){
	var win = $.messager.progress({
		title:title,
		msg:msg
	});
	setTimeout(function(){
		$.messager.progress('close');
	},timeout);
}

function _httpJSON(method, url, data, callback){
	var opt = {
		type : method, 
		dataType: 'json'
	};

	if( method === 'GET'){
		opt.url = url + '?' + data;
	}else if( method === 'POST'){
		opt.url = url;
		opt.data = JSON.stringify( data || {});
		opt.contentType = 'application/json';
	}

	$.ajax(opt).done(function(r){
		if( r && r.error ){
			return callback(r);
		}
		return callback( null, r );
	}).fail( function(jqXHR, textStatus){
		return callback({'error': 'http_bad_response', 'data': '' + jqXHR.status, 'message': '网络好像出问题了 (HTTP ' + jqXHR.status + ')'});
	});
}


function getJSON(url, data, callback){
	if( arguments.length === 2){
		callback = data;
		data = {};
	}
	if( typeof(data) === 'object'){
		var arr = [];
		$.each(data, function(k, v){
			arr.push( k + '=' + encodeURIComponent( v ));
		});
		data = arr.join('&');
	}
	_httpJSON( 'GET', url, data, callback );
}

function postJSON(url, data, callback){
	if( arguments.length === 2){
		callback = data;
		data = {};
	}
	_httpJSON( 'POST', url, data, callback );
}

function jumpToURL(url, timeout){
	if(timeout === undefined){
		timeout = 5000;
	}
	setTimeout( function(){		
		if(!url){
			window.history.back();
		}else{
			location.assign(url);
		}
	}, timeout );		
}

var one_day_time = 86400000;

function formatDate(second, withTime ){
	var date = new Date(second);
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


function formatNow(){
	return formatDate( Date.now());
}

function formatDateToMonth(date){
	var mm = date.getMonth()+1;
	return date.getFullYear() + '-' + (mm>9?mm:'0'+mm);	
}


/***** 提供给EASY_UI使用 *****/
function formatter_DateMonth(date){
	if (!date){return '';}
	var y = date.getFullYear();
	var m = date.getMonth() + 1;
	return y + '-' + (m<10?('0'+m):m);
}
function parser_DateMonth(s){
	if (!s) return new Date();
	var ss = (s.split('-'));
	var y = parseInt(ss[0],10);
	var m = parseInt(ss[1],10);
	var d = parseInt(ss[2],10);
	if (!isNaN(y) && !isNaN(m) && !isNaN(d)){
		return new Date(y,m-1,d);
	}else if(!isNaN(y) && !isNaN(m)){
		return new Date(y,m-1);
	} else {
		return new Date();
	}
}
function formatter_Date(date){
	if (!date){return '';}
	var y = date.getFullYear();
	var m = date.getMonth() + 1;
	var dd = date.getDate();
	return y + '-' + (m<10?('0'+m):m) + '-' + (dd>9?dd:'0'+dd);
}
function formatter_second_dg(value,row,index){
	var date = new Date(value);
	var dd = date.getDate(),
		mm = date.getMonth()+1;
	return date.getFullYear() + '-' + (mm>9?mm:'0'+mm) + '-' + (dd>9?dd:'0'+dd);
}
function formatter_time_dg(value,row,index){
	return formatDate(value,true);
}
function formatter_pre( value, row, index){
	return '<pre class="dv-pre-clear" style="font-size:12px">' + value + '</pre>';
}
function formatter_percent(value, row, index){
	return value + '%';
}


/*********project subsystem*************/
var gp_roleOptions = {
	leader: '组负责人',
	manager:'管理兼执行',
	executor: '执行成员'
};
var gpb_taskStatusMap = {
	created: '待需求确认',
	clear: '待接收执行',
	doing: '正在执行',
	pending: '已暂停执行',
	cancel: '已取消', 
	commit: '已提交',
	completed: '已完成'
};
var pb_status_colors = {
	doing:'#2d7091',
	commit: '#2d7091',
	completed: '#659f13'
};
function pb_formatter_status(value,row,index){
	if( pb_status_colors.hasOwnProperty(value)){
		return '<span style="color:'+ pb_status_colors[value] +'">' + gpb_taskStatusMap[value] + '</span>';
	}else{
		return gpb_taskStatusMap[value];
	}
}