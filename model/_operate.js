'use strict';
var 
	_ = require('lodash');


function* $updateRecord( r, new_data, cols ){
	var new_cols = [];
	_.each(cols, function(col){
		if( r[col] !== new_data[col]){
			r[col] = new_data[col];
			new_cols.push(col);
		}
	})
	if( new_cols.length > 0 ){
		yield r.$update(new_cols);
	}	
}

module.exports = {
	$updateRecord: $updateRecord
}