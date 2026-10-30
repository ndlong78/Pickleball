#!/usr/bin/env python3
"""Real PostgreSQL/PostgREST import tests; synthetic local users only.
--standalone uses PR1a SQL Auth fixture, never claims GoTrue coverage.
"""
import concurrent.futures
import json
import unittest
import uuid
import test_backend as backend
from test_backend import sql, quote, op_sql, plan

class ImportTests(unittest.TestCase):
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
        self.assertEqual(code,200,result)
        return result

    def begin(self,total=2,fingerprint='a'*64,excluded=None,opid=None,token=None,manifest_hash='b'*64):
        return self.rpc('begin_import',{'p_operation_id':opid or str(uuid.uuid4()),'p_source_fingerprint':fingerprint,'p_manifest_hash':manifest_hash,'p_adapter_version':'test1','p_source_schema':'backup-v1','p_source_item_count':total,'p_excluded':excluded or {'invalid':0,'unresolved':0,'local_only':0}},token)

    def item(self,path='preferences',kind='user_preferences',payload=None,rev='0',key='self',mode='apply'):
        return {'source_path':path,'kind':kind,'payload':payload if payload is not None else {'target_days':2},'expected_revision':rev,'entity_key':key,'mode':mode}

    def batch(self,manifest,items,rev='1',opid=None,token=None):
        return self.rpc('import_batch',{'p_operation_id':opid or str(uuid.uuid4()),'p_import_id':manifest['id'],'p_expected_revision':rev,'p_items':items},token)

    def finish(self,manifest,rev='2',accept=False,opid=None):
        return self.rpc('finish_import',{'p_operation_id':opid or str(uuid.uuid4()),'p_import_id':manifest['id'],'p_expected_revision':rev,'p_accept_quarantine':accept})

    def test_begin_resume_hash_and_protocol(self):
        operation=str(uuid.uuid4())
        a=self.begin(opid=operation)
        self.assertEqual(a['status'],'applied')
        self.assertEqual(self.begin(opid=operation)['replayed'],True)
        self.assertEqual(self.begin(opid=operation,total=3)['code'],'operation_id_reused')
        resumed=self.begin()
        self.assertEqual(resumed['import']['id'],a['import']['id'])
        self.assertTrue(resumed['resumed'])
        self.assertEqual(self.begin(manifest_hash='c'*64)['code'],'manifest_changed')
        self.assertEqual(self.begin(fingerprint='d'*64,excluded={'invalid':0,'unresolved':1,'local_only':0})['status'],'needs_review')
        self.assertEqual(self.rpc('get_import_status',{'p_import_id':a['import']['id'],'p_protocol_version':2})['status'],'upgrade_required')

    def test_apply_reconcile_finish_and_canonical_changes(self):
        manifest=self.begin()['import']
        self.assertEqual(self.finish(manifest,rev='1')['status'],'needs_review')
        first=self.batch(manifest,[self.item()])
        self.assertEqual(first['status'],'applied')
        self.assertEqual(first['import']['revision'],'2')
        self.assertEqual(self.finish(manifest)['status'],'needs_review')
        second=self.batch(manifest,[self.item('profile','profiles',{'display_name':'Synthetic','timezone':'Asia/Ho_Chi_Minh'})],rev='2')
        self.assertEqual(second['import']['counts']['applied'],2)
        done=self.finish(manifest,rev='3')
        self.assertEqual(done['import']['status'],'committed')
        self.assertEqual(done['import']['revision'],'4')
        self.assertEqual(self.batch(manifest,[self.item()],rev='4')['code'],'import_closed')
        rows=self.pull(limit=200)['changes']
        for change in rows:
            self.assertIsInstance(change['server_revision'],str)
            self.assertIsInstance(change['row']['revision'],str)
            self.assertEqual(change['row']['user_id'],self.a)
        prefs=next(c['row'] for c in rows if c['entity_kind']=='user_preferences')
        self.assertEqual(prefs['source_kind'],'legacy')
        self.assertEqual(prefs['source_fingerprint'],'a'*64)
        self.assertEqual(prefs['source_path'],'preferences')

    def test_last_invalid_item_rolls_back_data_mappings_receipts_and_counter(self):
        manifest=self.begin()['import']
        before=self.pull()
        operation=str(uuid.uuid4())
        result=self.batch(manifest,[self.item(),self.item('bad','profiles',{'user_id':self.b})],opid=operation)
        self.assertEqual(result['status'],'invalid')
        self.assertTrue(result['batch_rolled_back'])
        self.assertEqual(self.request('user_preferences?select=*',token=self.token_a)[1],[])
        self.assertEqual(self.request('legacy_import_items?select=*',token=self.token_a)[1],[])
        self.assertEqual(self.pull()['high_water'],before['high_water'])
        self.assertEqual(sql('select count(*) from pickleup_private.sync_receipts where user_id='+quote(self.a)+';')[-1],'1')
        corrected=self.batch(manifest,[self.item(),self.item('bad','profiles',{'display_name':'Synthetic','timezone':'UTC'})],opid=operation)
        self.assertEqual(corrected['status'],'applied')

    def test_domain_conflict_rolls_back_earlier_item_and_is_not_http_success(self):
        self.assertEqual(self.op('profiles',payload={'display_name':'Original','timezone':'UTC'})['status'],'applied')
        manifest=self.begin()['import']
        result=self.batch(manifest,[self.item(),self.item('profile','profiles',{'display_name':'Replacement'})])
        self.assertEqual(result['status'],'conflict')
        self.assertTrue(result['batch_rolled_back'])
        self.assertEqual(self.request('user_preferences?select=*',token=self.token_a)[1],[])
        profile=self.request('profiles?select=*',token=self.token_a)[1][0]
        self.assertEqual(profile['display_name'],'Original')
        self.assertEqual(profile['source_kind'],'manual')
        repaired=self.batch(manifest,[self.item(),self.item('profile','profiles',{'display_name':'Replacement'},rev='1')])
        self.assertEqual(repaired['status'],'applied')

    def test_response_lost_replay_and_source_path_hash_guard(self):
        manifest=self.begin(total=1)['import']
        operation=str(uuid.uuid4())
        first=self.batch(manifest,[self.item()],opid=operation)
        self.assertEqual(first['status'],'applied')
        self.assertTrue(self.batch(manifest,[self.item()],opid=operation)['replayed'])
        before=self.pull()['high_water']
        replay=self.batch(manifest,[self.item()],rev='2')
        self.assertEqual(replay['items'][0]['status'],'replayed')
        self.assertEqual(self.pull()['high_water'],before)
        self.assertEqual(self.batch(manifest,[self.item(payload={'target_days':3})],rev='2')['code'],'source_path_reused')
        finish_op=str(uuid.uuid4())
        self.assertEqual(self.finish(manifest,opid=finish_op)['status'],'applied')
        self.assertTrue(self.finish(manifest,opid=finish_op)['replayed'])

    def test_a_b_anon_and_internal_worker_grants(self):
        manifest=self.begin(total=1)['import']
        self.begin(total=1,token=self.token_b)
        self.assertEqual(self.rpc('get_import_status',{'p_import_id':manifest['id']},self.token_b)['code'],'import_not_available')
        self.assertEqual(self.batch(manifest,[self.item()],token=self.token_b)['code'],'import_not_available')
        for rpc,args in [('begin_import',{'p_operation_id':str(uuid.uuid4()),'p_source_fingerprint':'a'*64,'p_manifest_hash':'b'*64,'p_adapter_version':'test','p_source_schema':'test','p_source_item_count':1}),('get_import_status',{'p_import_id':manifest['id']}),('finish_import',{'p_operation_id':str(uuid.uuid4()),'p_import_id':manifest['id'],'p_expected_revision':'1'}),('import_batch',{'p_operation_id':str(uuid.uuid4()),'p_import_id':manifest['id'],'p_expected_revision':'1','p_items':[self.item()]})]:
            self.assertIn(self.request('rpc/'+rpc,args,token=self.anon)[0],(401,403))
        self.assertEqual(self.request('legacy_imports?id=eq.'+manifest['id'],token=self.token_b)[1],[])
        grants=sql("select has_function_privilege('authenticated','pickleup_private.operation_core(uuid,text,text,text,text,jsonb,integer,jsonb)','EXECUTE'),has_function_privilege('authenticated','pickleup_private.import_change(text,text,jsonb)','EXECUTE'),has_table_privilege('authenticated','legacy_import_items','INSERT');")[-1]
        self.assertEqual(grants,'f|f|f')
        self.assertEqual(sql("select rolbypassrls or rolsuper or rolcanlogin from pg_roles where rolname='pickleup_api';")[-1],'f')

    def test_counts_quarantine_and_null_cannot_bypass_confirmation(self):
        manifest=self.begin(total=1,excluded={'invalid':1,'unresolved':0,'local_only':0})['import']
        self.assertEqual(self.batch(manifest,[self.item()])['code'],'source_count_exceeded')
        self.assertEqual(self.finish(manifest,rev='1')['code'],'quarantine_confirmation_required')
        self.assertEqual(self.finish(manifest,rev='1',accept=None)['code'],'quarantine_confirmation_required')
        done=self.finish(manifest,rev='1',accept=True)
        self.assertEqual(done['status'],'applied')
        self.assertEqual(done['import']['report']['codes'],['quarantine_accepted'])

    def test_stable_owner_ids_distinct_sources_and_explicit_reuse(self):
        item=self.item('scores.0','legacy_score_snapshots',{'source_namespace':'weekly','source_key':'0','score':5},key=None)
        manifest=self.begin(total=1)['import']
        first=self.batch(manifest,[item]);self.assertEqual(first['status'],'applied')
        target=first['items'][0]['target_key']
        other=self.begin(total=1,fingerprint='d'*64)['import']
        duplicate=self.batch(other,[item]);self.assertEqual(duplicate['status'],'applied')
        self.assertNotEqual(duplicate['items'][0]['target_key'],target)
        b=self.begin(total=1,token=self.token_b)['import']
        b_row=self.batch(b,[item],token=self.token_b)
        self.assertNotEqual(b_row['items'][0]['target_key'],target)
        reuse_manifest=self.begin(total=1,fingerprint='e'*64)['import']
        reused=self.batch(reuse_manifest,[self.item('scores.0','legacy_score_snapshots',{},rev='1',key=target,mode='reuse')])
        self.assertEqual(reused['import']['counts']['reused'],1)
        self.assertEqual(len(self.request('legacy_score_snapshots?select=*',token=self.token_a)[1]),2)

    def test_batch_limits_mass_assignment_and_malformed_items(self):
        manifest=self.begin(total=100)['import']
        self.assertEqual(self.batch(manifest,[self.item()]*101)['code'],'invalid_batch')
        self.assertEqual(self.batch(manifest,[self.item(payload={'note':'x'*530000})])['code'],'invalid_batch')
        for change in [dict(self.item(),mode=None),dict(self.item(),source_path=None),dict(self.item(),payload={'source_kind':'legacy'}),dict(self.item(),kind='pg_catalog.pg_authid'),dict(self.item(),expected_revision=None),dict(self.item(),payload={'target_days':'2'}),dict(self.item(),payload={'target_days':7})]:
            self.assertEqual(self.batch(manifest,[change])['status'],'invalid')
        self.assertEqual(self.request('legacy_import_items?select=*',token=self.token_a)[1],[])

    def test_invalid_json_shapes_never_escape_as_sql_errors(self):
        manifest=self.begin(total=2)['import']
        for items in [None,{},'bad',3,[None],[[1]],[{}],[self.item(),self.item()]]:
            result=self.batch(manifest,items)
            self.assertEqual(result['status'],'invalid')
        for excluded in [[],{},'bad',{'invalid':'1','unresolved':0,'local_only':0},{'invalid':None,'unresolved':0,'local_only':0}]:
            result=self.rpc('begin_import',{'p_operation_id':str(uuid.uuid4()),'p_source_fingerprint':'e'*64,'p_manifest_hash':'b'*64,'p_adapter_version':'test','p_source_schema':'test','p_source_item_count':2,'p_excluded':excluded})
            self.assertEqual(result['status'],'invalid')
        self.assertEqual(self.pull()['high_water'],'1')

    def test_plan_dependency_mapping_and_foreign_reference_rejected(self):
        manifest=self.begin(total=2)['import']
        first=self.batch(manifest,[self.item('plans[0]','personal_plans',plan(),key=None)])
        self.assertEqual(first['status'],'applied')
        own_plan=first['items'][0]['target_key']
        other_plan=str(uuid.uuid4())
        self.assertEqual(self.op('personal_plans',key=other_plan,payload=plan(),token=self.token_b)['status'],'applied')
        payload={'plan_id':other_plan,'client_event_id':str(uuid.uuid4()),'exercise_id':'serve-1','skill':'serve','level_band':'1.0–2.0','kind':'drill','hits':12,'attempts':20,'note':'Synthetic','occurred_at':'2026-01-01T10:00:00Z'}
        item=self.item('training[0]','training_entries',payload,key=None)
        self.assertEqual(self.batch(manifest,[item],rev='2')['status'],'invalid')
        self.assertEqual(self.request('training_entries?select=*',token=self.token_a)[1],[])
        item['payload']['plan_id']=own_plan
        result=self.batch(manifest,[item],rev='2')
        self.assertEqual(result['status'],'applied')
        self.assertEqual(self.request('training_entries?select=*',token=self.token_a)[1][0]['plan_id'],own_plan)

    def test_old_manual_receipt_hash_is_still_compatible(self):
        operation=str(uuid.uuid4())
        # Seed a pre-refactor protocol1 receipt using the original SQL digest.
        sql("insert into pickleup_private.sync_heads(user_id) values("+quote(self.a)+"); insert into pickleup_private.sync_receipts(user_id,operation_id,request_hash,protocol_version,result) values("+quote(self.a)+','+quote(operation)+",encode(sha256(convert_to(jsonb_build_array('profiles',"+quote(self.a)+",'put','0','{}'::jsonb,1)::text,'UTF8')),'hex'),1,'{\"status\":\"applied\",\"legacy_receipt_fixture\":true}');")
        result=self.op('profiles',opid=operation)
        self.assertTrue(result['replayed'])
        self.assertTrue(result['legacy_receipt_fixture'])
        self.assertEqual(self.request('profiles?select=*',token=self.token_a)[1],[])

    def test_concurrent_batches_same_manifest_revision_only_one_commits(self):
        manifest=self.begin(total=2)['import']
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda items:self.batch(manifest,items),[[self.item()],[self.item('profile','profiles',{'display_name':'Synthetic','timezone':'UTC'})]]))
        self.assertEqual(sorted(r['status'] for r in results),['applied','conflict'])
        self.assertEqual(len(self.request('legacy_import_items?select=*',token=self.token_a)[1]),1)

    def test_batch_waits_for_manual_writer_rollback_without_cursor_gap(self):
        manifest=self.begin(total=1)['import']
        held,_=self.begin_held(op_sql(self.a,'user_preferences','self',0,{'target_days':3}))
        statement='select public.import_batch('+quote(str(uuid.uuid4()))+','+quote(manifest['id'])+",'1',"+quote(json.dumps([self.item()]))+');'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending=pool.submit(self.concurrent_sql,'pr3b-import-lock',statement)
            self.wait_for_lock('pr3b-import-lock')
            self.finish_held(held,'rollback')
            self.assertEqual(pending.result(timeout=20)['status'],'applied')
        changes=self.pull()['changes']
        self.assertEqual([int(c['server_revision']) for c in changes],list(range(1,len(changes)+1)))
        self.assertEqual(self.request('user_preferences?select=*',token=self.token_a)[1][0]['target_days'],2)

if __name__=='__main__':unittest.main(verbosity=2)
