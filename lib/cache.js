'use strict';

//init memcache

var 
	_ = require('lodash'),
	thunkify = require('thunkify'),
	Memcached = require('memcached'),
	config = require('./config'),
	log = require('./logger');

log.info('init memcache...');

var 
	DEFAULT_LIFETIME = 86400, //24h
	CACHE_PREFIX = config.cache.prefix,
	memcached = new Memcached( config.cache.host + ':' + config.cache.port, {
		timeout: config.cache.timeout,
		retries: config.cache.retries
	}),
	$m_incr = thunkify( function(key,inc, callback){
		memcached.incr( key, inc, callback );

	}),
	$m_get = thunkify( function(key,callback){
		memcached.get( key, callback);
	}),
	$m_set = thunkify( function(key, value, lifetime, callback){
		memcached.set(key,value, lifetime,callback);
	}),
	$m_del = thunkify( function(key, callback){
		memcached.del( key, callback );
	}),
	$m_getMulti = thunkify( function(keys,callback){
		memcached.getMulti( keys, callback );
	});
	memcached.flush(function(err){});


module.exports = {
	/* inc the key's value*/
	$incr: function* (key, initial){
		var 
			k = CACHE_PREFIX + key,
			data = yield $m_incr( k, 1);
			console.log( data );
		if( data === false ){
			if( initial === undefined ){
				initial = 0;
			}
			yield $m_set( k, initial + 1, DEFAULT_LIFETIME );
			data = initial + 1;
		}
		return data;
	}, 

	/* get number value for key*/
	$count: function* (key){
		var 
			k = CACHE_PREFIX + key,
			num = yield $m_get( k );
		return num === false ? 0 : num;
	},

	/* get one array, each element is number value associated with key in key collection*/
	$counts: function* (keys){
		if( keys.length === 0 ){
			return [];
		}
		var 
			multiKeys = _.map( keys, function(key){
				return CACHE_PREFIX + key;
			}),
			data = yield $m_getMulti( multiKeys );
		return _.map( multiKeys, function(key){
			return data[key] || 0;
		});
	},

	/* get key value */
	$get: function* (key, defaultValueOrFn, lifetime ){
		/**
         * get value from cache by key. If key not exist:
         *   return default value if defaultValueOrFn is not a function,
         *   otherwise call defaultValueOfFn, put the result into cache
         *   and return as value.
         */
        var
            k = CACHE_PREFIX + key,
            data = yield $m_get(k);
        if (data !== undefined ) {
            log.debug('[cache] hit: ' + key);
            return data;
        }
        log.debug('[Cache] NOT hit: ' + key);
        if (defaultValueOrFn) {
            lifetime = lifetime || DEFAULT_LIFETIME;
            if (typeof (defaultValueOrFn) === 'function') {
                if (defaultValueOrFn.constructor.name === 'GeneratorFunction') {
                    data = yield defaultValueOrFn();
                }
                else {
                    data = defaultValueOrFn();
                }
            }
            else {
                data = defaultValueOrFn;
            }
            yield $m_set(k, data, lifetime);
            log.debug('[cache] cache set for key: ' + key);
        }
        else {
            data = null;
        }
        return data;
	},

	/* get one array, each element is object  associated with key in key collection*/
	$gets: function* (keys){
		if( keys.length === 0 ){
			return [];
		}
		var 
			multiKeys = _.map( keys, function(key){
				return CACHE_PREFIX + key;
			}),
			data = yield $m_getMulti( multiKeys );
		return _.map( multiKeys, function(key){
			return data[key] === undefined ? null : data[key];
		});
	}, 

	$set: function* (key, value, lifetime){
		var k = CACHE_PREFIX + key;
		yield $m_set(k, value, lifetime || DEFAULT_LIFETIME );
		log.debug('[cache] cache set for key: ' + key);
	},

	$remove: function* (key){
		var k = CACHE_PREFIX + key;
		yield $m_del(k);
	},

	set: function (key, value, lifetime){
		var k = CACHE_PREFIX + key;
		var retval = false;
		memcached.set( k, value, lifetime || DEFAULT_LIFETIME, function(err){
			if( !err )
				retval = true;
		})
		log.debug('[cache] cache set for key: ' + key);
	},

	service: memcached

};