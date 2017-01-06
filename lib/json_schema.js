'use strict';

// json schema.js

var
	_ = require('lodash'),
	api = require('./api'),
	constants = require('./constants'),
	jjv = require('jjv'),
	log = require('./logger'),
	env = jjv();

env.defaultOptions.useDefault = true;
env.defaultOptions.removeAdditional = true;

var code2Message = {
	required: '参数不能为空',
	email: '无效的电子邮件',
	pattern: '格式无效',
	minLength: '不满足最少字符',
	maxLength: '超过了允许最大字符',
	minimum: '超出了最小允许范围',
	exclusiveMinimum: '超出了最小允许范围',
	maximum: '超出了最大允许范围',
	exclusiveMaximum: '超出了最大允许范围',
};

function translateMessage(field, invalids) {
	if (invalids.length === 0) {
		return '无效的值：' + field;
	}
	var msg = code2Message[invalids[0]];
	if (msg) {
		return field + msg;
	}
	return '无效的值' + field;
}

var createApiError = function (errors) {
	if (!errors.validation) {
		return api.invalidRequest('json', 'Invalid JSON request.');
	}
	var err = null;
	log.warn('>>> ' + JSON.stringify(errors.validation));
	_.each(errors.validation, function (v, k) {
		if (err === null) {
			err = api.invalidParam(k, translateMessage(k, Object.getOwnPropertyNames(v)));
			return false;
		}
	});
	if (err === null) {
		return api.invalidRequest('json', 'Invalid JSON request.');
	}
	err.validation = errors.validation;
	return err;
}

// common patterns:

var PROPERTY = {

	BRIEF:{
		type: 'string',
		minLength: 1,
		maxLength: 100
	},
	CHECKACTION:{
		type: 'string',
		minLength: 1
	},
	EMPTYSTRING:{
		type: 'string'
	},
	ENVIRONMENT:{
		type: 'string',
		minLength: 1,
		maxLength: 20
	},
	FUNCTIONNAME:{
		type: 'string',
		minLength: 3,
		maxLength: 50,
		pattern:'^[a-z0-9A-Z\\_\\-\\$]{3,50}$'
	},
	HELP:{
		type: 'string',
		minLength: 1
	},  
	ID: {
		type: 'string',
		pattern: '^[0-9a-f]{50}$'
	},
	ID_EMPTY: {
		type: 'string',
		pattern: '^([0-9a-f]{50})?$'
	},
	ID_EXT: {
		type: 'string',
		pattern: '^([0-9a-z]{1,50})?$'
	},
	KEYWORD:{
		type: 'string',
		minLength: 3,
		maxLength: 100
	},
	LANGUAGE:{
		type: 'string',
		minLength: 1,
		maxLength: 20
	},	
	MINI_INTEGER: {
		type: 'integer',
		minimum: 0,
		maximum: 256
	},
	NONNEGATIVE_INTEGER: {
		type: 'integer',
		minimum: 0,
		maximum: 32506358400000
	},
	NOTEMPTY_STRING: {
		type: 'string',
		minLength: 1
	},
	POSITIVE_INTEGER: {
		type: 'integer',
		minimum: 1,
		maximum: 32506358400000
	},
	
	EMAIL: {
		type: 'string',
		maxLength: 100,
		pattern: '^(?:[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+\\.)*[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+@(?:(?:(?:[a-z0-9](?:[a-z0-9\\-](?!\\.)){0,61}[a-z0-9]?\\.)+[a-z0-9](?:[a-z0-9\\-](?!$)){0,61}[a-z0-9]?)|(?:\\[(?:(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.){3}(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\]))$',
	},

	URL: {
		type: 'string',
		minLength: 1,
		maxLength: 1000,
		pattern: '^\\s*[^\\s]+.*$'
	},

	PASSWD: {
		type: 'string',
		pattern: '^[a-zA-Z0-9]{40}$'
	},
	SNIPPET:{
		type: 'string',
		minLength: 1,
		desc: '源代码'
	},

	NAME: {
		type: 'string',
		minLength: 1,
		maxLength: 100,
		pattern: '^\\s*[^\\s]+.*$'
	},

	DESCRIPTION: {
		type: 'string',
		minLength: 1,
		maxLength: 1000
	},

	DESCRIPTION_OPTIONAL: {
		type: 'string',
		maxLength: 1000,
		default: ''
	},

	ALIAS: {
		type: 'string',
		pattern: '^[a-z0-9\\_\\-]{1,50}$',
	},

	TEXT: {
		type: 'string',
		minLength: 1,
		maxLength: 65536, // 64K
	},

	TEXT_EMPTY: {
		type: 'string',
		minLength: 0,
		maxLength: 65536, // 64K
	},

	TEXT_OPTIONAL: {
		type: 'string',
		maxLength: 65536, // 64K
		default: ''
	},

	SETTING: {
		type: 'string',
		minLength: 0,
		maxLength: 16384, // 16K
	},

	TAGS: {
		type: 'string',
		maxLength: 100,
		default: ''
	},

	TAG: {
		type: 'string',
		minLength: 1,
		maxLength: 50,
		pattern: '^\\s*[^\\s]+.*$'
	},

	CODE_TYPE: {
		type: 'string',
		enum: ['', 'html', 'css', 'javascript', 'java', 'csharp', 'php'],
		default: ''
	},

	ID_LIST: {
		type: 'array',
		items: {
			type: 'string',
			pattern: '^[0-9a-f]{50}$'
		},
		minItems: 1,
		uniqueItems: true
	},

	ID_EMPTY_LIST: {
		type: 'array',
		items: {
			type: 'string',
			pattern: '^[0-9a-f]{50}$'
		},
		minItems: 0,
		uniqueItems: true
	},

	MIME: {
		type: 'string',
		pattern: '^[0-9a-z]{1,15}\\/[0-9a-z\\.\\-]{1,24}$'
	},

	FILE: {
		type: 'string',
		minLength: 1,
		maxLength: 1400000 // 1 MB binary, 1.33 M with base64
	},

	TIMESTAMP: {
		type: 'integer',
		minimum: 0,
		maximum: 32506358400000 // 3000-1-1 0:0:0 UTC
	},

	IMAGE: {
		type: 'string',
		minLength: 1,
		maxLength: 1400000 // 1MB before base64, 1.33M after base64
	},
	USERNAME:{
		type: 'string',
		minLength: 3,
		maxLength: 50,
		pattern: '^[a-z0-9\\_\\-]{3,50}$'
	},
	USERNAMEOREMAIL:{
		type: 'string',
		minLength: 3,
		maxLength: 50,
		pattern: '^((?:[A-Za-z0-9\\_\\-]{3,50})|(?:(?:[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+\\.)*[\\w\\!\\#\\$\\%\\&\\\'\\*\\+\\-\\/\\=\\?\\^\\\`\\{\\|\\}\\~]+@(?:(?:(?:[a-z0-9](?:[a-z0-9\\-](?!\\.)){0,61}[a-z0-9]?\\.)+[a-z0-9](?:[a-z0-9\\-](?!$)){0,61}[a-z0-9]?)|(?:\\[(?:(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\.){3}(?:[01]?\\d{1,2}|2[0-4]\\d|25[0-5])\\]))))$'
	}
};

var schemas = {
	authenticate: {
		type: 'object',
		properties: {
			username: PROPERTY.USERNAMEOREMAIL,
			password: PROPERTY.PASSWD
		},
		required: ['username', 'password']
	},
	changePassword:{
		type: 'object',
		properties: {
			oldpassword: PROPERTY.PASSWD,
			newpassword: PROPERTY.PASSWD
		},
		required:['oldpassword', 'newpassword']
	},
	checkSnippet:{
		type: 'object',
		properties: {
			id: PROPERTY.ID,
			type: PROPERTY.CHECKACTION,
			advice: PROPERTY.EMPTYSTRING,
			timeused: PROPERTY.TIMESTAMP
		},
		required:['id', 'type', 'advice','timeused']
	},
	confirmemail: {
		type: 'object',
		properties: {
			email: PROPERTY.EMAIL
		},
		required:['email']
	},
	courseCreate: {
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			brief: PROPERTY.BRIEF,
			details: PROPERTY.DESCRIPTION
		},
		required:['name', 'brief', 'details']
	},
	createAccount:{
		type: 'object',
		properties: {
			username: PROPERTY.USERNAME,            
			password: PROPERTY.PASSWD,
			email: PROPERTY.EMAIL,
			name: PROPERTY.NAME
		},
		required: ['username', 'password', 'email', 'name']
	},
	createSnippet:{
		type: 'object',
		properties: {
			name: PROPERTY.FUNCTIONNAME,
			brief: PROPERTY.BRIEF,
			language:PROPERTY.LANGUAGE,
			environment:PROPERTY.ENVIRONMENT,
			keywords:PROPERTY.KEYWORD,
			code:PROPERTY.SNIPPET,
			help:PROPERTY.HELP,
			attachments:PROPERTY.ID_EMPTY_LIST
		},
		required:['name', 'brief', 'language', 'environment', 'keywords', 'code', 'help', 'attachments']
	},
	workDaily: {
		type: 'object',
		properties: {
			task_id: PROPERTY.ID,
			duration: PROPERTY.MINI_INTEGER,
			report:PROPERTY.TEXT_EMPTY,
			plan:PROPERTY.TEXT_EMPTY,
			time:PROPERTY.TIMESTAMP,
			percent: PROPERTY.MINI_INTEGER
		},
		required:['task_id', 'duration', 'report', 'plan', 'time', 'percent']
	},
	editwiki:{
		type: 'object',
		properties: {
			section: PROPERTY.NONNEGATIVE_INTEGER,
			content: PROPERTY.TEXT
		},
		required:['section', 'content']
	},
	editTask: {
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			executor_id: PROPERTY.ID,
			manager_id: PROPERTY.ID,
			plan_duration:PROPERTY.MINI_INTEGER,
			plan_start_time:PROPERTY.TIMESTAMP,
			plan_end_time:PROPERTY.TIMESTAMP,
			automode:PROPERTY.MINI_INTEGER,
			//rely_to: PROPERTY.EMPTYSTRING,
			difficulty: PROPERTY.MINI_INTEGER,
			details: PROPERTY.TEXT_EMPTY,
			relyTo: PROPERTY.ID_EMPTY_LIST
		},
		required:['name', 'executor_id', 'manager_id', 'plan_duration', 'plan_start_time', 'plan_end_time', 'automode', 'difficulty', 'details', 'relyTo']
	},
	product:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			sid: PROPERTY.ID,
		},
		required:['name', 'sid']
	},
	productSeries:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
		},
		required:['name']
	},
	project:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			start_time: PROPERTY.TIMESTAMP,
			end_time:PROPERTY.TIMESTAMP,
			master_id:PROPERTY.ID,
			details:PROPERTY.TEXT,
			status:PROPERTY.EMPTYSTRING
		},
		required:['name', 'start_time', 'end_time', 'master_id', 'details','status']
	},
	project_create:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			start_time: PROPERTY.TIMESTAMP,
			end_time:PROPERTY.TIMESTAMP,
			master_id:PROPERTY.ID,
			details:PROPERTY.TEXT
		},
		required:['name', 'start_time', 'end_time', 'master_id', 'details']
	},
	section_create: {
		type: 'object',
		properties: {
			course_id: PROPERTY.ID_EXT,
			name: PROPERTY.NAME,
			brief: PROPERTY.BRIEF,
			content:PROPERTY.EMPTYSTRING,
			attachments: PROPERTY.ID_EMPTY_LIST
		},
		required:['course_id', 'name', 'brief', 'content', 'attachments']
	},
	simpleDepartment:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			pid: PROPERTY.ID_EXT,
		},
		required:['name', 'pid']
	},
	simpleTask: {
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			parent: PROPERTY.ID_EXT,
			executor: PROPERTY.ID,
			duration:PROPERTY.MINI_INTEGER,
			start_time:PROPERTY.TIMESTAMP,
			end_time:PROPERTY.TIMESTAMP,
			automode:PROPERTY.MINI_INTEGER,
			relyTo: PROPERTY.ID_EMPTY_LIST,
			difficulty: PROPERTY.MINI_INTEGER,
			details: PROPERTY.TEXT_EMPTY
		},
		required:['name', 'parent', 'executor', 'duration', 'start_time', 'end_time', 'automode', 'relyTo', 'difficulty', 'details']
	},
	taskFlow: {
		type: 'object',
		properties: {
			action: PROPERTY.NOTEMPTY_STRING,
			reply: PROPERTY.TEXT_EMPTY
		},
		required:['action', 'reply']
	},
	tplModule:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
		},
		required:['name']
	},
	updateWebsiteSettings: {
		type: 'object',
		properties: {
			name: PROPERTY.SETTING,
			description: PROPERTY.SETTING,
			keywords: PROPERTY.SETTING,
			xmlns: PROPERTY.SETTING,
			custom_header: PROPERTY.SETTING,
			custom_footer: PROPERTY.SETTING
		}
	},
	updateSnippets: {
		type: 'object',
		properties: {
			body_top: PROPERTY.SETTING,
			body_bottom: PROPERTY.SETTING,
			sidebar_left_top: PROPERTY.SETTING,
			sidebar_left_bottom: PROPERTY.SETTING,
			sidebar_right_top: PROPERTY.SETTING,
			sidebar_right_bottom: PROPERTY.SETTING,
			content_top: PROPERTY.SETTING,
			content_bottom: PROPERTY.SETTING
		}
	},
	userEdit:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
		},
		required:['name']
	},
	version:{
		type: 'object',
		properties: {
			name: PROPERTY.NAME,
			pid: PROPERTY.ID,
		},
		required:['name', 'pid']
	}
}

_.each(schemas, function (v, k) {
	env.addSchema(k, v);
});

module.exports = {
	validate: function (schemaName, data) {
		var errors = env.validate(schemaName, data);
		if (errors !== null) {
			throw createApiError(errors);
		}
	}
};
