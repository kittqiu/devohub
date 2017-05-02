'use strict';

var 
	base = require('./base'),
	home = require( __base + 'controller/home'),
	db = require( __base + 'lib/db'),
	api = require( __base + 'lib/api');

var modelEvaluation = db.team_evaluation;

function* $_render( context, model, view ){
    context.render( 'team/' + view, yield home.$getModel.apply(context, [model]) );
}

/**************
GET METHOD:
/team/evaluation
/api/team/evaluation?user=xx&year=xx&&month=xx

POST METHOD:
/api/team/evaluation/add
/api/team/evaluation/:id/edit


*************/

module.exports = {

	'GET /team/evaluation': function* (){
		yield $_render( this, {}, 'evaluation.html');
	},

	'GET /api/team/evaluation': function* (){
		var q = this.request.query,
			uid = q.user || '',
			year = q.year || 2016,
			month = q.month || 0;
		this.body = yield base.evaluation.$get( uid, year, month );
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
			},
			uid = this.request.user.id,
			old_data = yield base.evaluation.$get( uid, date.getFullYear(), date.getMonth() );

		if( !!old_data && old_data.hasOwnProperty('evaluation') ){
			throw api.notAllowed( "已有月工作评价，不能再次创建！");
		}
		
		yield base.evaluation.$create( uid, date, evaluation );
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
	}
};