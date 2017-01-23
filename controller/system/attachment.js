'use strict';
var
	crypto = require('crypto'),

	thunkify = require('thunkify'),
	cofs = require('co-fs'), 
	fs = require('fs'),
	path = require('path'),
	cs = require('co-stream'),
	db = require(__base + 'lib/db'),
	log = require(__base + 'lib/logger');

var 
	//$__hashFile = thunkify(hashFile),
	modelAtt = db.attachment;

function* $__saveFile(istream, ostream){
	var cin = new (cs.Reader)(istream),
		cos = new (cs.Writer)(ostream), 
		data, 
		size = 0;
	while(data = yield cin.read()) {
		yield cos.write(data);
		size += data.length;
	}
	yield cos.end();
	return size;
}

function* $_saveTmpFile(istream, fname){
	var tmpname  = fname + Date.now() + '.tmp',
		tmppath = './media/tmp',
		size, os;
	yield $_createDirs(tmppath);
	tmppath += '/' + tmpname;
	os = fs.createWriteStream(tmppath);
	size = yield $__saveFile(istream, fs.createWriteStream(tmppath));
	os.end();
	return {path:tmppath, name: tmpname, size: size};
}

function* $_hashFile(path){
	var crypter = crypto.createHash('sha1'),
		is = fs.createReadStream(path),
		cin = new (cs.Reader)(is),
		data;

	while(data = yield cin.read()) {
		crypter.update( data );
	}
	return crypter.digest('hex');
}

function* $_createDirs(dist){	
	var dist = path.resolve(dist);
	if( yield cofs.exists(dist)){
		return true;
	}else{
		var parent = path.dirname(dist);
		if( !(yield cofs.exists(parent)) ){
			yield $_createDirs(parent);
		}
		yield cofs.mkdir(dist);		
	}
	return true;
}

function* $_createAttachment(tmppath, fileName, subsystem){
	var att,
		fhash = yield $_hashFile( tmppath ), 
		dhash = crypto.createHash('sha1').update(fhash).digest('hex'),
		parent = './media/' + subsystem + '/' + dhash.substr(0,2) + '/' + dhash.substr(2,2),
		path = parent + '/' + fhash,
		id = db.next_id(), 
		newop = true;

	log.info( "Create attachment: " + fileName + ", hash:" + fhash + ",to:" + path );
	yield $_createDirs(parent);
	if( fs.existsSync(path) ){//hash conflict
		if( fs.statSync(path).size === fs.statSync(tmppath).size ){//same file
			newop = false;
		}else{//conflict
			path += Date.now();
		}
	}

	if( newop ){
		yield cofs.rename(tmppath, path);
		att = {
			id: id,
			refer: 0, 
			name: fileName, 
			path: path
		};
		yield modelAtt.$create( att );
	}
	else{
		att = yield modelAtt.$find({
			select: ['id'],
			where: '`path`=?',
			params: [path]
		});
		id = att.id;
		yield cofs.unlink(tmppath);
		console.log( 'unlink ' + tmppath );
	}
	return id;
}

function* $_addRefer(id){
	var att = yield modelAtt.$find(id);
	att.refer += 1;
	yield att.$update(['refer']);
}

function* $_descRefer(id){
	var att = yield modelAtt.$find(id);
	att.refer -= 1;
	yield att.$update(['refer']);
}

module.exports = {
	$createAttachment: $_createAttachment,
	$saveTmpFile: $_saveTmpFile,

	$addRefer: $_addRefer,
	$descRefer: $_descRefer
};