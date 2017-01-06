function showErrorInfo(title, msg){
	var t = arguments.length == 1 ? '错误': title;
	var m = arguments.length == 1 ? title: msg;
	$.messager.show({
		title:t,
		msg:m,
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
	if(!timeout){
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
