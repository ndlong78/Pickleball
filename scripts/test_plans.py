"""PR5b1a plan/selection capability over verified loopback REST/PG. No cloud input."""
import concurrent.futures, json, subprocess, unittest, uuid
import test_backend as backend
from test_backend import sql, quote

def advanced_plan():
    source="global.window=globalThis;require('./curriculum.js');require('./advanced-curriculum.js');require('./advanced-coach-core.js');const scores=Object.fromEntries(['third','reset','movement','counter','doubles','decision'].map(k=>[k,12]));process.stdout.write(JSON.stringify(PICKLEUP_ADVANCED_COACH.createPlan(scores,[],'3.0–3.5','2026-01-01T10:00:00Z',PICKLEUP_ADVANCED_CURRICULUM)))"
    snapshot=json.loads(subprocess.check_output(['node','-e',source],text=True))
    return {'source':'advanced','schema_version':1,'level_band':'3.0–3.5','plan_snapshot':snapshot}

class PlanTests(unittest.TestCase):
    setUpClass=backend.BackendTests.__dict__['setUpClass']
    setUp=backend.BackendTests.setUp
    tearDown=backend.BackendTests.tearDown
    request=backend.BackendTests.request
    op=backend.BackendTests.op
    pull=backend.BackendTests.pull
    begin_held=backend.BackendTests.begin_held
    finish_held=backend.BackendTests.finish_held
    wait_for_lock=backend.BackendTests.wait_for_lock
    concurrent_sql=backend.BackendTests.concurrent_sql
    def rpc(self,name,args,token=None):
        code,result=self.request('rpc/'+name,args,token or self.token_a);self.assertEqual(code,200);return result
    def prepare(self,token=None):
        result=self.rpc('prepare_sync',{},token);self.assertEqual(result['status'],'ok');return result['epoch']
    def body(self,value=None,kind='personal_plans',key=None,revision='0',action='put',epoch=None,operation=None):
        return {'p_operation_id':operation or str(uuid.uuid4()),'p_kind':kind,'p_entity_key':key or ('self' if kind=='user_selections' else str(uuid.uuid4())),'p_action':action,'p_expected_revision':revision,'p_epoch':epoch or self.prepare(),'p_payload':backend.plan() if value is None else value,'p_protocol_version':1}
    def apply(self,body,token=None):return self.rpc('apply_plan_operation',body,token)

    def test_basic_advanced_create_exact_replay_and_result_only_update(self):
        for value in [backend.plan(),advanced_plan()]:
            body=self.body(value);first=self.apply(body);self.assertEqual(first['status'],'applied');self.assertEqual(first['row']['user_id'],self.a);self.assertEqual(first['row']['revision'],'1');self.assertTrue(self.apply(body)['replayed'])
            update=self.body({'check_score':17,'completed_at':'2026-01-01T12:00:00Z'},key=body['p_entity_key'],revision='1');result=self.apply(update);self.assertEqual(result['status'],'applied');self.assertEqual(result['row']['check_score'],17);self.assertEqual(result['row']['plan_snapshot'],value['plan_snapshot']);self.assertEqual(result['row']['revision'],'2')
        self.assertEqual(self.request('practice_checkins',token=self.token_a)[1],[]);self.assertEqual(self.request('training_entries',token=self.token_a)[1],[])

    def test_immutable_fields_cannot_be_resent_or_changed_and_bind_their_rejected_request(self):
        body=self.body();self.assertEqual(self.apply(body)['status'],'applied')
        for field,value in [('plan_snapshot',body['p_payload']['plan_snapshot']),('source','advanced'),('level_band','2.0–2.5'),('schema_version',1)]:
            patch=self.body({field:value},key=body['p_entity_key'],revision='1');self.assertEqual(self.apply(patch)['code'],'immutable_plan_fields');self.assertEqual(self.apply(patch)['status'],'invalid');self.assertEqual(self.apply({**patch,'p_payload':{'check_score':12}})['code'],'operation_id_reused')
        self.assertEqual(self.request('personal_plans',token=self.token_a)[1][0]['revision'],1)

    def test_selection_own_live_dependency_and_plan_delete_restore_order(self):
        body=self.body();self.assertEqual(self.apply(body)['status'],'applied');key=body['p_entity_key']
        selection=self.body({'selected_personal_plan_id':key,'selected_academy_lesson_id':'PU-001'},kind='user_selections');self.assertEqual(self.apply(selection)['status'],'applied')
        blocked=self.body({},key=key,revision='1',action='delete');self.assertEqual(self.apply(blocked)['status'],'invalid')
        self.assertEqual(self.apply(self.body({},kind='user_selections',revision='1',action='delete'))['status'],'applied');self.assertEqual(self.apply(self.body({},key=key,revision='1',action='delete'))['status'],'applied')
        restore_selection=self.body({},kind='user_selections',revision='2',action='restore');self.assertEqual(self.apply(restore_selection)['status'],'invalid')
        self.assertEqual(self.apply(self.body({'check_score':18},key=key,revision='2'))['status'],'conflict')
        self.assertEqual(self.apply(self.body({},key=key,revision='2',action='restore'))['status'],'applied')
        # Failed dependency receipt stays failed after the plan returns; review creates a new command.
        self.assertEqual(self.apply(restore_selection)['status'],'invalid');self.assertEqual(self.apply({**restore_selection,'p_operation_id':str(uuid.uuid4())})['status'],'applied')

    def test_owner_anon_grants_cross_capability_and_reference_isolation(self):
        body=self.body();self.assertIn(self.request('rpc/apply_plan_operation',body)[0],(401,403));self.assertEqual(self.apply(body)['status'],'applied')
        b_epoch=self.prepare(self.token_b);foreign={**body,'p_operation_id':str(uuid.uuid4()),'p_epoch':b_epoch,'p_expected_revision':'1','p_payload':{'check_score':19}}
        denied=self.apply(foreign,self.token_b);self.assertEqual(denied['status'],'conflict');self.assertIsNone(denied.get('row'))
        selection=self.body({'selected_personal_plan_id':body['p_entity_key']},kind='user_selections',epoch=b_epoch);self.assertEqual(self.apply(selection,self.token_b)['status'],'invalid');self.assertEqual(self.request('personal_plans',token=self.token_b)[1],[])
        for method in ['apply_sync_operation','apply_event_operation']:self.assertEqual(self.rpc(method,body)['status'],'invalid')
        for kind in ['profiles','user_preferences','academy_attempts','training_entries']:self.assertEqual(self.apply({**body,'p_kind':kind})['status'],'invalid')
        for table in ['personal_plans','user_selections']:
            for method in ['POST','PATCH','DELETE']:
                value=({'check_score':12} if table=='personal_plans' else {'selected_academy_lesson_id':'PU-001'}) if method!='DELETE' else None
                self.assertIn(self.request(table,value,self.token_a,method)[0],(401,403))

    def test_shape_validation_protocol_server_fields_and_legacy_compatibility(self):
        body=self.body()
        for patch in [{'p_payload':None},{'p_payload':[]},{'p_payload':'bad'},{'p_payload':12},{'p_expected_revision':'01'},{'p_entity_key':'legacy-id'},{'p_kind':'user_selections','p_entity_key':body['p_entity_key']}]:self.assertEqual(self.apply({**body,**patch})['status'],'invalid')
        self.assertEqual(self.apply({**body,'p_protocol_version':2})['status'],'upgrade_required');self.assertEqual(self.apply({**body,'p_payload':{**body['p_payload'],'user_id':self.b}})['status'],'invalid')
        legacy_id,operation=str(uuid.uuid4()),str(uuid.uuid4());self.assertEqual(self.op('personal_plans',legacy_id,payload=backend.plan(),opid=operation)['status'],'applied');self.assertEqual(self.apply(self.body(key=legacy_id,operation=operation))['code'],'operation_id_reused')
        self.assertEqual(self.apply(body)['code'],'operation_id_reused')

    def test_same_request_and_cas_races_preserve_conflict_receipts(self):
        body=self.body()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:self.apply(body),range(2)))
        self.assertEqual([r['status'] for r in results],['applied','applied']);self.assertEqual(sum(r.get('replayed',False) for r in results),1)
        a=self.body({'check_score':14},key=body['p_entity_key'],revision='1');b={**a,'p_operation_id':str(uuid.uuid4()),'p_payload':{'check_score':18}}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(self.apply,[a,b]))
        self.assertEqual(sorted(r['status'] for r in results),['applied','conflict']);loser=[a,b][next(i for i,r in enumerate(results) if r['status']=='conflict')];self.assertEqual(self.apply(loser)['status'],'conflict');self.assertTrue(self.apply(loser)['replayed']);self.assertEqual(self.pull()['high_water'],'2')

    def test_epoch_reset_rejects_old_replay_and_operation_rebinding(self):
        body=self.body();self.assertEqual(self.apply(body)['status'],'applied');fresh=str(uuid.uuid4());sql('update pickleup_private.sync_heads set epoch='+quote(fresh)+' where user_id='+quote(self.a)+';')
        self.assertEqual(self.apply(body)['status'],'reset_required');self.assertEqual(self.apply({**body,'p_epoch':fresh})['code'],'operation_epoch_mismatch');self.assertEqual(self.pull()['high_water'],'1')

    def test_epoch_is_checked_under_restore_lock_before_any_plan_commit(self):
        body=self.body();fresh=str(uuid.uuid4());held,_=self.begin_held('reset role; update pickleup_private.sync_heads set epoch='+quote(fresh)+' where user_id='+quote(self.a)+';')
        args=[body['p_operation_id'],body['p_kind'],body['p_entity_key'],'put','0',body['p_epoch'],json.dumps(body['p_payload'])];statement='select public.apply_plan_operation('+','.join(quote(x) for x in args)+',1);'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(self.concurrent_sql,'pr5b-epoch-lock',statement);self.wait_for_lock('pr5b-epoch-lock');self.finish_held(held,'commit');self.assertEqual(pending.result(timeout=20)['status'],'reset_required')
        self.assertEqual(self.request('personal_plans',token=self.token_a)[1],[]);self.assertEqual(sql('select count(*) from pickleup_private.sync_operation_epochs where user_id='+quote(self.a)+';')[-1],'0')

if __name__=='__main__':unittest.main(verbosity=2)
