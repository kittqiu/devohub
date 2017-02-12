'use strict';

/*
 * This is the default configuration for snippet-fibula.
 * 
 * DO NOT change it. Instead, make a copy and rename to:
 * "config_development.js" which is enabled in development environment.
 * "config_production.js" which is enabled in production environment.
 * Then edit settings you needed.
 */

 module.exports = {
	name: 'devohub',
	 // server domain name:
	domain: 'www.devohub.com',
	ip: '',
	port: 80,
	// the theme used, default to 'default':
	theme: 'default',
	home: '/project',
	log: {
		volume: 'loud',
		level: 2
	},
	security: {
		//password salt
		salt: 'rCZNC2S2ZN7FIkFBMzZL',
		email_suffix: '@devohub.com'
	},
	session: {
		cookie: 'devohubsession',
		// used to generate secure session cookie, can be set to any random string:
		salt: 'XqnzCREjPFQdpO5eftVc',
		// signin expires in N seconds:
		expires: 7 * 24 * 3600,
		// use https for management:
		httpsForManagement: false
	},
	db: {
		// host or ip address of mysql, e.g. '192.168.1.123':
		host: 'localhost',
		// port of mysql, default to 3306:
		port: 3306,
		// user to login to mysql, change to your mysql user:
		user: 'www',
		// password to login to mysql, change to your mysql password:
		password: 'www',
		// database used in mysql, default to 'snippet':
		database: 'devohub',
		// timeout before initial a connection to mysql, default to 3 seconds:
		connectTimeout: 3000,
		// maximum concurrent db connections:
		connectionLimit: 20,
		// acquire timeout:
		acquireTimeout: 3000,
		// waiting queue size:
		queueLimit: 10
	},
	cache:{
		prefix: 'fibula/',
		// host or ip address of memcached:
		host: '127.0.0.1',
		// port of memcached, default to 11211:
		port: 11211,
		// connection timeout, default to 1 second:
		timeout: 1000,
		// retries when failed:
		retries: 3
	},
	// NOT USED NOW:
	cdn: {
		static_prefix: ''
	},

	smtp:{
		enable: true,
		host: 'mail.example.com',
		port: 25,
		secure: true,   //set true if support ssl
		ignoreTLS: true,//if this is true and secure is false, TLS will not be used 
		//user name and password
		authuser:'admin@example.com',
		authpassword:'example',
		admin: 'admin@example.com'
	},

	search:{
		//host of redis
		host: '127.0.0.1',
		port: 6379
	},

	project: {
		page_size: 20,
		scope_limit: false
	},

	snippet: {
		page_size: 10,
		large_page_size: 20,
		score_delta: 34,
		create_search_engine: true
	},

	train: {
		page_size: 20
	},

	job: {
		reminder_work_evaluation: 3,
		reminder_month_kpi: 2
	},

	team: {
		manager_list:[]
	},

	// END:
	END: 'END'
 };