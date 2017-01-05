'use strict';

/*初始化全局变量*/
process.productionMode = (process.env.NODE_ENV === 'production');/*根据系统环境变量得出是否为生产模式*/
global.__base = __dirname + '/';


var 
	_ = require("lodash"),
	fs = require("fs"),
	koa = require("koa"),
	route = require('koa-route'),
	bodyParser = require('koa-bodyparser'),
	swig = require('swig'),	
	config = require('./lib/config'),
	i18n = require('./lib/i18n'),
	db = require('./lib/db'),
	auth = require('./lib/auth'),
	constants = require('./lib/constants'),
	log = require('./lib/logger'),
	app = koa();//global app，加载Web APP

var 
	isDevelopment = !process.productionMode,
	static_prefix = config.cdn.static_prefix,
	activeTheme = config.theme,
	hostname = require('os').hostname(),
	swigTemplatePath = __dirname + '/view/',// set view template
	i18nT = i18n.getI18NTranslators('./view/i18n');//load i18n，加载国际化模块

/*应用配置*/
app.name = 'devohub';
app.proxy = true;

app.use( auth.$userIdentityParser );//从cookie中解析得到用户信息
app.use( bodyParser());/*try to parse body to be a json object or a form object*/


/*
 * 配置静态资源文件获取方式 
 *On producton, serve static files by http container.
 * Otherwise by nodejs.
 * 在生产模式下，静态资源文件通过Web容器方式获取，
 * 在开发模式下，直接通过nodejs得到
 */
function serveStatic(){
	var root = __dirname;
	app.use( function* (next){
		var
			method = this.request.method,
			path = this.request.path,
			pos;

		if( method === 'GET' && (path.indexOf('/static/') === 0 || path === '/favicon.ico')){
			log.debug('GET static path: ' + path);
			pos = path.lastIndexOf('.');
			if( pos !== -1 ){
				this.type = path.substring(pos);
			}
			this.body = fs.createReadStream( root + path );
			return;
		}else{
			yield next;
		}
	});
}

/* locate before other middleware*/
if( process.productionMode ){
	app.on( 'error', function(err){
		log.error( '[Unhandled ERR] ', err);
	});
	//serveStatic();
}else{
	serveStatic();
}


/*注册页面内参数替换函数*/
swig.setDefaults({
	cache: process.productionMode ? 'memory' : false
});
function swFind(input,str) { return input.indexOf(str) !== -1; }
swig.setFilter('find', swFind);

function swURL(input,str) { 
	input = input.replace(/\+/g, '%2B');
	input = input.replace(' ', '+');
	input = input.replace(/#/g, '%23');	
	input = input.replace(/\//g, '%2F');
	return input;
}
swig.setFilter('url', swURL);

function swTimeToDate(input,str) {
	var date = new Date(input);
	return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
}
swig.setFilter('time2Date', swTimeToDate);

function swTimeToTime(input,str) {
	var date = new Date(input);
	return date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate() 
			+ ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}
swig.setFilter('time2time', swTimeToTime);

/*define template render function, log execution time and catch the exception*/
/*核心中间件:http请求处理*/
app.use( function* theMiddleWare(next){
	var 
		request = this.request,
		response = this.response,
		method = request.method,
		path = request.path,
		prefix8 = path.substring( 0, 8 ),
		prefix4 = path.substring( 0, 4 ),
		start = Date.now(),//start time
		execTime,
		isApi = path.indexOf('/api/') === 0 ;

	log.info('Request ' + method + ' ' + path );
	
	//只有管理员才能访问manage地址
	if (prefix8.startsWith('/manage') && request.path !== '/login') {
		if( !request.user || request.user.role != constants.role.ADMIN ) {
			response.redirect('/');
			return;
		}
	}

	this.translate = i18n.createI18N( request.get('Accept-Language') || 'en', i18nT );
	if( isApi ){
		if( isDevelopment ){
			log.logJSON( '[API Request]', request.body );
		}
	}else{
		//根据模板生成返回的显示页面
		this.render = function( template, model){
			model._ = this.translate;//i18n.createI18N( request.get('Accept-Language') || 'en', i18nT );
			model.__static_prefix = static_prefix;
			model.__user__ = request.user;
			model.__time__ = start;
			model.__theme__ = activeTheme;
			model.__request__ = request;
			var renderHtml = swig.renderFile( swigTemplatePath + template, model );
			response.body = renderHtml;
			response.type = '.html';
		};
	}

	try{
		if( auth.loginRequired(this) ){//GET method and require login
			return;
		}else{
			yield next;//action now，所有后续业务处理都在此
		}
		
		execTime = String(Date.now() - start);
		response.set('X-Cluster-Node', hostname);
		response.set( 'X-Execution-Time', execTime );    	
		if (response.status === 404) {
			this.throw(404);
		}
	}catch(err){
		execTime = String(Date.now() - start);
		response.set('X-Execution-Time', execTime);
		log.error('error when handle url: ' + request.path + ' on X-Execution-Time: ' + execTime);
		log.error(err.stack);

		if (err.code && err.code === 'POOL_ENQUEUELIMIT') {/*system error: mysql connect pool*/
			// force kill node process:
			log.error( ' [FATAL] POOL_ENQUEUELIMIT, process exit 1.');
			process.exit(1);
		}

		if (isApi) {
			// API error:
			response.body = {
				error: err.error || (err.status === 404 ? '404' : '500'),
				data: err.data || '',
				message: err.status === 404 ? 'API not found.' : (err.message || 'Internal error.')
			};
		}
		else if (err.status === 404 || err.error === 'entity:notfound') {
			response.body = '404 Not Found'; //this.render('404.html', {});
		}
		else if( err.error === 'auth:failed'){
			this.redirect('/sys/error/auth');
		}
		else {
			log.error( ' [ERROR] 500 ' + err.stack );
			response.body = '500 Internal Server Error'; //this.render('500.html', {});
		}
		if (execTime > 1000) {
			log.warn( ' X-Execution-Time too long: ' + execTime);
		}
	}

	/*log the response on api request*/
	if (isApi) {
		if (isDevelopment) {
			log.logJSON( '[API Response]', response.body);
		}
	}
});

/*
 * scan controller directory and load all modules
 */

function registerRoute(method, path, fn){
	if( method === 'GET' ){
		log.debug( "found route: GET %s", path );
		app.use( route.get(path,fn));
	}else if( method === 'POST'){
		log.debug( "found route: POST %s", path );
		app.use( route.post(path,fn));
	}
}

//return file name array，得到controller目录下所有js文件的文件名集合
function loadControllerFileNames(){
	var files = fs.readdirSync( __dirname + "/controller" ),
		re = new RegExp( "^[A-Za-z][A-Za-z0-9\\_]*\\.js$"),
		jss = _.filter( files, function(f){
			return re.test(f);
		});
		log.debug( jss );
	return _.map( jss, function(f){
		return f.substring(0, f.length-3);
	});
}

/* find *Api.js in controller sub directory and load it*/
function loadApiModule(parent, ctrls){
	var files = fs.readdirSync( __dirname + '/' + parent ),
		re = new RegExp( "^[A-Za-z][A-Za-z0-9\\_]*Api\\.js$"),
		jss = _.filter( files, function(f){
			return re.test(f);
		}),
		modules = _.map( jss, function(f){
			return f.substring(0, f.length-3);
		}),
		pkg = parent.replace('/', '.');

	_.each(modules, function(module){
		var cls = parent +'/' + module;
		ctrls[cls] = require( parent + '/' + module );
		log.debug('load module: cls(' + cls + '), mod(' + parent + '/' + module + ')');
	});

	_.each( files, function(f){
		var file = parent + '/' + f;
		if( fs.statSync( __dirname + '/' + file).isDirectory()){
			_.merge( ctrls, loadApiModule(file, {}));
		}
	});
	return ctrls;
}

function loadControllerSubSystem(){
	var ctrls = {},
		parent = "./controller",
		files = fs.readdirSync( __dirname + '/' + parent );

	_.each( files, function(f){
		var file = parent + '/' + f;
		if( fs.statSync( __dirname + '/' + file).isDirectory()){
			_.merge( ctrls, loadApiModule(file, {}));
		}
	});
	return ctrls;
}

//load modules by require statments
function loadControllers(){
	var ctrls = {};
	_.each( loadControllerFileNames(), function(filename){
		ctrls[filename] = require('./controller/' + filename );
	});
	_.merge( ctrls, loadControllerSubSystem());
	return ctrls;
}

var controllers = loadControllers();

/*register routes*/
_.each(controllers, function(ctrl, filename){
	_.each( ctrl, function(fn, path){
		var ss, method, route, docs;

		if( path === 'LoginRequired'){
			auth.registerAuthPaths(fn);
			return;
		}

		ss = path.split(' ', 2);
		if( ss.length !== 2 ){
			log.warn( "Invalid route definition: " + path );
			return;
		}

		method = ss[0];
		route = ss[1];
		if( method === 'GET' ){
			log.debug("found: GET " + route + " in " + filename + ".js");
			registerRoute( "GET", route, fn );
		}else if( method === 'POST'){
			log.debug("found: POST " + route + " in " + filename + ".js");
			registerRoute( "POST", route, fn );
		}else{
			log.warn( "Invalid method:" + method );
		}
	});
});

var daemon = require('./controller/daemon/main');

app.listen(config.port);
log.info( 'application start in %s mode at %d', (process.productionMode ? 'production' : 'development', config.port));
