'use strict';

var nodemailer = require('nodemailer'),
	config = require(__base +'lib/config'),
	log = require(__base +'lib/logger');


var smtpConfig = {
	host: config.smtp.host,
	port: config.smtp.port,
	secure: config.smtp.secure,
	ignoreTLS: config.smtp.ignoreTLS,
	auth: {
		user:config.smtp.authuser,
		pass:config.smtp.authpassword
	}
};
var transporter = nodemailer.createTransport( smtpConfig ); 

function sendHtml(from, to, subject, html ){
	var mailData = {
		from: from || '"Admin"<' + config.smtp.admin + '>',
		to: to,
		subject: subject || 'blank title',
		html: html
	};
	if( config.smtp.enable ){
		transporter.sendMail(mailData, function(err, info){
			if(err){
				log.error(err);
			}else{
				log.debug('Message sent: ' + info.response);      
			}
		});
	}
}

module.exports = {
	sendHtml: sendHtml
}
