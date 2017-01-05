'use strict';

// define constants:

module.exports = {
	// user role
	role : {
		ADMIN:       0,
		MASTER:      100,
		DEVELOPER:   10000,
		GUEST:       100000000
	},

	signin: {
        LOCAL: 'local'
    },


	//cache keys:
	cache:{
		NAVIGATIONS: '__navigations__',
		WEBSITE: '__website__',
		SNIPPETS: '__snippets__',
		SETTINGS: '__settings__'
	},

	// END:
    END: 'ended.'
};