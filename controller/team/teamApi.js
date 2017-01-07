'use strict';

var 
	base = require('./base'),
	home = require( __base + 'controller/home'),
	db = require( __base + 'lib/db');

var modelEvaluation = db.team_evaluation;

function* $_render( context, model, view ){
    context.render( 'team/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/team
/team/evaluation
/api/team/evaluation?user=xx&year=xx&&month=xx
/api/team/member/list?contain_unactived=false
/api/team/member/:id/roles
/api/team/member/:id

POST METHOD:
/api/team/evaluation/add
/api/team/evaluation/:id/edit


*************/

module.exports = {
	'GET /team': function*(){
		yield $_render( this, {}, 'team.html');
	},

	'GET /team/evaluation': function* (){
		yield $_render( this, {}, 'team_evaluation.html');
		base.setHistoryUrl(this);
	},

	'GET /api/team/evaluation': function* (){
		var q = this.request.query,
			uid = q.user || '',
			year = q.year || 2016,
			month = q.month || 0;
		this.body = yield base.evaluation.$get( uid, year, month );
	},

	'GET /api/team/member/list': function* (){
		var q = this.request.query,
			contain_unactived = q.contain_unactived || 'false';
		
		this.body = yield base.member.$getUsers( contain_unactived=='true');
	},

	'GET /api/team/member/:id/roles': function* (id){
		this.body = yield base.member.$listRoles(id);
	},

	'GET /api/team/member/:id': function* (id){
		this.body = yield base.member.$collectUser(id);
	},

	'POST /api/team/evaluation/add': function* (){
		var data = this.request.body,
			date = !!data.date ? new Date(data.date) : new Date(),
			evaluation = {
				corework: data.corework|| "",
				output: data.output|| "",
				process: data.process|| "", 
				goodjob: data.goodjob|| "",
				badjob: data.badjob || "",
				other: data.other || ""
			};
		
		yield base.evaluation.$create( this.request.user.id, date, evaluation );
		this.body = { result: 'ok' }
	},

	'POST /api/team/evaluation/:id/edit': function* (id){
		var data = this.request.body,
			r = yield modelEvaluation.$find(id),
			evaluation, nr = {};

		if( r === null ){
			throw api.notFound('evaluation record');
		}
		
		evaluation = JSON.parse( r.evaluation );
		if( data.type === 'byuser'){
			evaluation.corework = data.corework|| "";
			evaluation.output = data.output|| "";
			evaluation.process = data.process|| ""; 
			evaluation.goodjob = data.goodjob|| "";
			evaluation.badjob = data.badjob || "";
			evaluation.other = data.other || "";
			nr.manager_id = r.manager_id;
		}else{//bymanager
			evaluation.kpi = data.kpi || "";
			evaluation.outputeval = data.outputeval || "";
			evaluation.goodjobeval = data.goodjobeval || "";
			evaluation.badjobeval = data.badjobeval || "";
			nr.manager_id = this.request.user.id;
		}
		
		nr.evaluation = JSON.stringify( evaluation );
		
		yield db.op.$update_record( r, nr, ['manager_id', 'evaluation']);
		this.body = { result: 'ok' }
	},

	'LoginRequired': [ /^\/team[\s\S]*/, /^\/api\/team[\s\S]*/]
};