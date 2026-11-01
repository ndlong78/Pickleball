"""Fenced sync RPC over real loopback REST/PG. Never accepts a cloud URL."""
import concurrent.futures, json, unittest, uuid
import test_backend as backend
from test_backend import sql, quote

class SyncTests(unittest.TestCase):
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
        result=self.rpc('prepare_sync',{},token)
        self.assertEqual(result['status'],'ok')
        return result

    def body(self,epoch,revision='0',payload=None,operation=None,kind='user_preferences',key='self',action='put'):
        return {'p_operation_id':operation or str(uuid.uuid4()),'p_kind':kind,'p_entity_key':key,'p_action':action,'p_expected_revision':revision,'p_epoch':epoch,'p_payload':payload if payload is not None else {'target_days':3},'p_protocol_version':1}

    def test_permissions_owner_and_protocol(self):
        a,b=self.prepare(),self.prepare(self.token_b)
        self.assertNotEqual(a['epoch'],b['epoch'])
        for method,args in [('prepare_sync',{}),('apply_sync_operation',self.body(a['epoch']))]:
            self.assertIn(self.request('rpc/'+method,args)[0],(401,403))
        self.assertEqual(self.rpc('prepare_sync',{'p_protocol_version':2})['status'],'upgrade_required')
        self.assertEqual(self.rpc('apply_sync_operation',self.body(a['epoch'],payload={'user_id':self.b}))['status'],'invalid')
        self.assertEqual(self.rpc('apply_sync_operation',self.body(a['epoch'],kind='profiles'))['status'],'invalid')
        self.assertEqual(self.rpc('apply_sync_operation',self.body(a['epoch']),self.token_b)['status'],'reset_required')
        self.assertEqual(self.request('user_preferences',token=self.token_b)[1],[])

    def test_exact_replay_binding_and_legacy_compatibility(self):
        head=self.prepare();self.assertEqual(head['server_revision'],'0')
        body=self.body(head['epoch']);result=self.rpc('apply_sync_operation',body)
        self.assertEqual(result['status'],'applied');self.assertEqual(self.rpc('apply_sync_operation',body)['replayed'],True)
        changed={**body,'p_payload':{'target_days':5}}
        self.assertEqual(self.rpc('apply_sync_operation',changed)['code'],'operation_id_reused')
        legacy=str(uuid.uuid4());self.assertEqual(self.op('user_preferences',rev=1,payload={'target_days':4},opid=legacy)['status'],'applied')
        self.assertEqual(self.rpc('apply_sync_operation',self.body(head['epoch'],'1',{'target_days':4},legacy))['code'],'operation_id_reused')
        self.assertEqual(self.pull()['high_water'],'2')

    def test_cas_race_has_one_winner_and_retains_conflict_receipt(self):
        head=self.prepare()
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda n:self.rpc('apply_sync_operation',self.body(head['epoch'],payload={'target_days':n})),[2,4]))
        self.assertEqual(sorted(r['status'] for r in results),['applied','conflict'])
        self.assertEqual(self.pull()['high_water'],'1')
        self.assertEqual(sql('select count(*) from pickleup_private.sync_operation_epochs where user_id='+quote(self.a)+';')[-1],'2')

    def test_tombstone_restore_and_rejected_stale_create(self):
        epoch=self.prepare()['epoch'];kind='practice_checkins';key='2026-01-01'
        done=self.body(epoch,payload={'status':'done','minutes':30,'lesson_id':None,'timezone_at_entry':'UTC'},kind=kind,key=key)
        self.assertEqual(self.rpc('apply_sync_operation',done)['status'],'applied')
        delete=self.body(epoch,'1',{'timezone_at_entry':'UTC'},kind=kind,key=key,action='delete')
        self.assertEqual(self.rpc('apply_sync_operation',delete)['row']['minutes'],None)
        self.assertEqual(self.rpc('apply_sync_operation',done)['replayed'],True)
        self.assertEqual(self.rpc('apply_sync_operation',{**done,'p_operation_id':str(uuid.uuid4())})['status'],'conflict')
        restore={**done,'p_operation_id':str(uuid.uuid4()),'p_expected_revision':'2','p_action':'restore'}
        self.assertEqual(self.rpc('apply_sync_operation',restore)['row']['revision'],'3')

    def test_restore_fences_old_receipt_and_prevents_rebinding(self):
        epoch=self.prepare()['epoch'];body=self.body(epoch);self.assertEqual(self.rpc('apply_sync_operation',body)['status'],'applied')
        new=str(uuid.uuid4());sql('update pickleup_private.sync_heads set epoch='+quote(new)+' where user_id='+quote(self.a)+';')
        self.assertEqual(self.rpc('apply_sync_operation',body)['status'],'reset_required')
        self.assertEqual(self.rpc('apply_sync_operation',{**body,'p_epoch':new})['code'],'operation_epoch_mismatch')
        self.assertEqual(self.pull()['high_water'],'1')
        self.assertEqual(self.request('user_preferences',token=self.token_a)[1][0]['revision'],1)

    def test_epoch_is_rechecked_under_the_same_lock_after_restore_commits(self):
        epoch=self.prepare()['epoch'];new=str(uuid.uuid4());body=self.body(epoch)
        held,_=self.begin_held('reset role; update pickleup_private.sync_heads set epoch='+quote(new)+' where user_id='+quote(self.a)+';')
        args=[body['p_operation_id'],'user_preferences','self','put','0',epoch,json.dumps(body['p_payload'])]
        statement='select public.apply_sync_operation('+','.join(quote(v) for v in args)+',1);'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(self.concurrent_sql,'pr4b-epoch-lock',statement)
            self.wait_for_lock('pr4b-epoch-lock');self.finish_held(held,'commit')
            self.assertEqual(pending.result(timeout=20)['status'],'reset_required')
        self.assertEqual(self.request('user_preferences',token=self.token_a)[1],[])
        self.assertEqual(sql('select count(*) from pickleup_private.sync_operation_epochs where user_id='+quote(self.a)+';')[-1],'0')

if __name__=='__main__':unittest.main(verbosity=2)
