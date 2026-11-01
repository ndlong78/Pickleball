"""PR5a1 event RPC over verified loopback REST/PostgreSQL. No cloud input."""
import concurrent.futures, json, uuid, unittest
import test_backend as backend
from test_backend import sql, quote

KINDS=['academy_attempts','skill_assessments','training_entries','match_records']
WHEN='2026-01-01T10:00:00Z'
def payload(kind,event_id=None,plan_id=None):
    shared={'client_event_id':event_id or str(uuid.uuid4()),'occurred_at':WHEN}
    if kind=='academy_attempts':
        return dict(shared,lesson_id='PU-001',skill='serve',level_band='1.0–2.0',score=12,content_version='test-1',lesson_snapshot={'title':'Synthetic serve'},conditions=None)
    if kind=='skill_assessments':
        return dict(shared,assessment_type='self',scale=2,scores=dict.fromkeys(['serve','return','dink','volley','position','strategy'],1))
    if kind=='training_entries':
        return dict(shared,plan_id=plan_id,exercise_id='serve-1',skill='serve',level_band='1.0–2.0',kind='drill',hits=12,attempts=20,note='',conditions=None)
    return dict(shared,mode='doubles',ours=11,theirs=7,focus='serve-return',note='',doubles_issue=None)

class ActivityTests(unittest.TestCase):
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
        code,result=self.request('rpc/'+name,args,token or self.token_a)
        self.assertEqual(code,200)
        return result
    def prepare(self,token=None):
        result=self.rpc('prepare_sync',{},token);self.assertEqual(result['status'],'ok');return result['epoch']
    def body(self,kind='academy_attempts',value=None,epoch=None,key=None,revision='0',action='put',operation=None):
        return {'p_operation_id':operation or str(uuid.uuid4()),'p_kind':kind,'p_entity_key':key or str(uuid.uuid4()),'p_action':action,'p_expected_revision':revision,'p_epoch':epoch or self.prepare(),'p_payload':payload(kind) if value is None else value,'p_protocol_version':1}

    def test_four_domains_append_replay_and_delete_without_attendance(self):
        plan_id=str(uuid.uuid4());self.assertEqual(self.op('personal_plans',plan_id,payload=backend.plan())['status'],'applied')
        for kind in KINDS:
            with self.subTest(kind=kind):
                body=self.body(kind,payload(kind,plan_id=plan_id));first=self.rpc('apply_event_operation',body)
                self.assertEqual(first['status'],'applied');self.assertEqual(first['row']['revision'],'1');self.assertEqual(first['row']['user_id'],self.a)
                self.assertEqual(self.rpc('apply_event_operation',body)['replayed'],True)
                self.assertEqual(self.rpc('apply_event_operation',{**body,'p_operation_id':str(uuid.uuid4()),'p_expected_revision':'1'})['status'],'invalid')
                deleted=self.rpc('apply_event_operation',{**body,'p_operation_id':str(uuid.uuid4()),'p_expected_revision':'1','p_action':'delete','p_payload':{}})
                self.assertEqual(deleted['status'],'applied');self.assertEqual(deleted['row']['revision'],'2');self.assertIsNotNone(deleted['row']['deleted_at'])
                self.assertEqual(self.rpc('apply_event_operation',body)['row']['revision'],'1')
                self.assertEqual(self.rpc('apply_event_operation',{**body,'p_operation_id':str(uuid.uuid4()),'p_expected_revision':'2','p_action':'restore'})['status'],'invalid')
        self.assertEqual(self.request('practice_checkins',token=self.token_a)[1],[])

    def test_identical_attempts_stay_distinct_but_client_event_uuid_cannot_be_reused(self):
        first=self.body();self.assertEqual(self.rpc('apply_event_operation',first)['status'],'applied')
        collision={**first,'p_operation_id':str(uuid.uuid4()),'p_entity_key':str(uuid.uuid4())}
        self.assertEqual(self.rpc('apply_event_operation',collision)['status'],'invalid')
        distinct={**collision,'p_operation_id':str(uuid.uuid4()),'p_payload':{**first['p_payload'],'client_event_id':str(uuid.uuid4())}}
        self.assertEqual(self.rpc('apply_event_operation',distinct)['status'],'applied')
        rows=self.request('academy_attempts',token=self.token_a)[1];self.assertEqual(len(rows),2);self.assertEqual([r['score'] for r in rows],[12,12])

    def test_grants_owner_and_capability_boundaries(self):
        body=self.body();self.assertIn(self.request('rpc/apply_event_operation',body)[0],(401,403))
        self.assertEqual(self.rpc('apply_event_operation',{**body,'p_kind':'user_preferences','p_entity_key':'self'})['status'],'invalid')
        self.assertEqual(self.rpc('apply_sync_operation',body)['status'],'invalid')
        self.assertEqual(self.rpc('apply_event_operation',{**body,'p_protocol_version':2})['status'],'upgrade_required')
        self.assertEqual(self.rpc('apply_event_operation',{**body,'p_payload':{**body['p_payload'],'user_id':self.b}})['status'],'invalid')
        self.assertEqual(self.rpc('apply_event_operation',{**body,'p_operation_id':str(uuid.uuid4())})['status'],'applied')
        self.assertEqual(self.rpc('apply_event_operation',body,self.token_b)['status'],'reset_required')
        b_epoch=self.prepare(self.token_b)
        result=self.rpc('apply_event_operation',{**body,'p_operation_id':str(uuid.uuid4()),'p_epoch':b_epoch,'p_action':'delete','p_expected_revision':'1','p_payload':{}},self.token_b)
        self.assertEqual(result['status'],'conflict');self.assertIsNone(result.get('row'))
        self.assertEqual(self.request('academy_attempts',token=self.token_b)[1],[])
        for method in ['POST','PATCH','DELETE']:
            code,_=self.request('academy_attempts'+('' if method=='POST' else '?id=eq.'+body['p_entity_key']),body['p_payload'] if method!='DELETE' else None,self.token_a,method)
            self.assertIn(code,(401,403))

    def test_constraints_scale_conditions_and_same_owner_plan_reference(self):
        foreign=str(uuid.uuid4());self.assertEqual(self.op('personal_plans',foreign,payload=backend.plan(),token=self.token_b)['status'],'applied')
        invalid=[('training_entries',payload('training_entries',plan_id=foreign)),('skill_assessments',{**payload('skill_assessments'),'scale':20}),('academy_attempts',{**payload('academy_attempts'),'score':21}),('academy_attempts',{**payload('academy_attempts'),'conditions':{'feed':'unknown','pace':'slow','target':'wide'}}),('match_records',{**payload('match_records'),'note':'x'*281})]
        for kind,value in invalid:
            with self.subTest(kind=kind):self.assertEqual(self.rpc('apply_event_operation',self.body(kind,value))['status'],'invalid')
        for kind in KINDS:self.assertEqual(self.request(kind,token=self.token_a)[1],[])

    def test_exact_uuid_binding_blocks_mutation_and_legacy_receipt_adoption(self):
        body=self.body();self.assertEqual(self.rpc('apply_event_operation',body)['status'],'applied')
        self.assertEqual(self.rpc('apply_event_operation',{**body,'p_payload':{**body['p_payload'],'score':13}})['code'],'operation_id_reused')
        legacy=str(uuid.uuid4()),str(uuid.uuid4())
        self.assertEqual(self.op('academy_attempts',legacy[0],payload=payload('academy_attempts'),opid=legacy[1])['status'],'applied')
        self.assertEqual(self.rpc('apply_event_operation',self.body(key=legacy[0],operation=legacy[1]))['code'],'operation_id_reused')
        mutable=str(uuid.uuid4());epoch=self.prepare();self.assertEqual(self.rpc('apply_sync_operation',{'p_operation_id':mutable,'p_kind':'user_preferences','p_entity_key':'self','p_action':'put','p_expected_revision':'0','p_epoch':epoch,'p_payload':{'target_days':3}})['status'],'applied')
        self.assertEqual(self.rpc('apply_event_operation',self.body(operation=mutable,epoch=epoch))['code'],'operation_id_reused')

    def test_two_concurrent_requests_replay_one_event_and_two_ids_race_on_one_key(self):
        body=self.body()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda _:self.rpc('apply_event_operation',body),range(2)))
        self.assertEqual([r['status'] for r in results],['applied','applied']);self.assertEqual(sum(r.get('replayed',False) for r in results),1)
        other=self.body()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda operation:self.rpc('apply_event_operation',{**other,'p_operation_id':operation}),[str(uuid.uuid4()),str(uuid.uuid4())]))
        self.assertEqual(sorted(r['status'] for r in results),['applied','conflict']);self.assertEqual(len(self.request('academy_attempts',token=self.token_a)[1]),2)

    def test_restore_epoch_is_rechecked_while_waiting_on_the_head_lock(self):
        epoch=self.prepare();body=self.body(epoch=epoch);changed=str(uuid.uuid4())
        held,_=self.begin_held('reset role; update pickleup_private.sync_heads set epoch='+quote(changed)+' where user_id='+quote(self.a)+';')
        args=[body['p_operation_id'],body['p_kind'],body['p_entity_key'],'put','0',epoch,json.dumps(body['p_payload'])]
        statement='select public.apply_event_operation('+','.join(quote(v) for v in args)+',1);'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(self.concurrent_sql,'pr5a-epoch-lock',statement);self.wait_for_lock('pr5a-epoch-lock');self.finish_held(held,'commit');self.assertEqual(pending.result(timeout=20)['status'],'reset_required')
        self.assertEqual(self.request('academy_attempts',token=self.token_a)[1],[])
        self.assertEqual(sql('select count(*) from pickleup_private.sync_operation_epochs where user_id='+quote(self.a)+';')[-1],'0')
        fresh={**body,'p_epoch':changed};self.assertEqual(self.rpc('apply_event_operation',fresh)['status'],'applied')
        second=str(uuid.uuid4());sql('update pickleup_private.sync_heads set epoch='+quote(second)+' where user_id='+quote(self.a)+';')
        self.assertEqual(self.rpc('apply_event_operation',fresh)['status'],'reset_required');self.assertEqual(self.rpc('apply_event_operation',{**fresh,'p_epoch':second})['code'],'operation_epoch_mismatch')

    def test_event_rollback_then_mutable_commit_has_no_change_cursor_gap(self):
        body=self.body();args=[body['p_operation_id'],body['p_kind'],body['p_entity_key'],'put','0',body['p_epoch'],json.dumps(body['p_payload'])]
        held,result=self.begin_held('select public.apply_event_operation('+','.join(quote(v) for v in args)+',1);');self.assertEqual(result['status'],'applied');self.assertEqual(self.pull()['high_water'],'0')
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(self.concurrent_sql,'pr5a-shared-lock',backend.op_sql(self.a,'user_preferences','self',0,{'target_days':3}));self.wait_for_lock('pr5a-shared-lock');self.finish_held(held,'rollback');self.assertEqual(pending.result(timeout=20)['status'],'applied')
        self.assertEqual(self.pull()['high_water'],'1');self.assertEqual(self.request('academy_attempts',token=self.token_a)[1],[])

if __name__=='__main__':unittest.main(verbosity=2)
