"""Real loopback GoTrue + Mailpit + RPC integration. Never print credentials/codes."""
import json, subprocess, time, re, uuid, urllib.request, urllib.error
status=json.loads(subprocess.check_output(['supabase','status','-o','json'],stderr=subprocess.DEVNULL))
base=status['API_URL']
assert base=='http://127.0.0.1:54321'
key=status['ANON_KEY']
def call(path,data=None,token=None):
    req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            body=r.read()
            return r.status,json.loads(body) if body else {}
    except urllib.error.HTTPError as e:return e.code,{}
def login():
    email='otp-'+uuid.uuid4().hex+'@example.invalid'
    code,_=call('/auth/v1/otp',{'email':email,'create_user':True});assert code==200
    otp=None
    for _ in range(60):
        with urllib.request.urlopen('http://127.0.0.1:54324/api/v1/messages') as r:messages=json.load(r)['messages']
        for m in messages:
            if any(to['Address']==email for to in m['To']):
                with urllib.request.urlopen('http://127.0.0.1:54324/api/v1/message/'+m['ID']) as r:body=json.load(r)
                otp=re.search(r'\b([0-9]{6,10})\b',body['Text'] or body['HTML']).group(1)
                break
        if otp:break
        time.sleep(.5)
    assert otp, 'email capture timeout'
    code,_=call('/auth/v1/verify',{'email':email,'token':'0000000000','type':'email'});assert code>=400
    code,session=call('/auth/v1/verify',{'email':email,'token':otp,'type':'email'});assert code==200 and session['access_token']
    return session
A=login(); B=login()
imports=[]
for session,name in [(A,'A'),(B,'B')]:
    code,result=call('/rest/v1/rpc/apply_operation',{'p_operation_id':str(uuid.uuid4()),'p_kind':'profiles','p_entity_key':'self','p_action':'put','p_expected_revision':'0','p_payload':{'display_name':name,'timezone':'Asia/Ho_Chi_Minh'},'p_protocol_version':1},session['access_token'])
    assert code==200 and result['status']=='applied'
    code,result=call('/rest/v1/rpc/pull_changes',{},session['access_token']);assert code==200 and result['status']=='ok'
    assert all(c['row']['user_id']==session['user']['id'] for c in result['changes'])
    code,result=call('/rest/v1/rpc/begin_import',{'p_operation_id':str(uuid.uuid4()),'p_source_fingerprint':'c'*64,'p_manifest_hash':'d'*64,'p_adapter_version':'auth-test1','p_source_schema':'synthetic','p_source_item_count':1},session['access_token'])
    assert code==200 and result['status']=='applied'
    import_id=result['import']['id'];imports.append(import_id)
    batch={'p_operation_id':str(uuid.uuid4()),'p_import_id':import_id,'p_expected_revision':'1','p_items':[{'source_path':'preferences','kind':'user_preferences','entity_key':'self','expected_revision':'0','payload':{'target_days':2},'mode':'apply'}]}
    code,result=call('/rest/v1/rpc/import_batch',batch,session['access_token']);assert code==200 and result['status']=='applied'
    code,result=call('/rest/v1/rpc/import_batch',batch,session['access_token']);assert code==200 and result['replayed']
    code,result=call('/rest/v1/rpc/finish_import',{'p_operation_id':str(uuid.uuid4()),'p_import_id':import_id,'p_expected_revision':'2'},session['access_token']);assert code==200 and result['import']['status']=='committed'
    code,result=call('/rest/v1/rpc/pull_changes',{},session['access_token']);assert code==200 and result['status']=='ok'
    assert all(c['row']['user_id']==session['user']['id'] for c in result['changes'])
assert imports[0]!=imports[1]
code,result=call('/rest/v1/rpc/get_import_status',{'p_import_id':imports[0]},B['access_token']);assert code==200 and result['code']=='import_not_available'

probe=subprocess.run(['node','scripts/test_import_controller.cjs'],input=json.dumps({'apiURL':base,'key':key,'sessions':[{'user':{'id':session['user']['id']},'access_token':session['access_token']} for session in [A,B]]}),text=True,capture_output=True)
safe_error=re.search(r'failed: ([A-Za-z0-9_]+)',probe.stderr)
assert probe.returncode==0, 'JS controller integration failed: '+(safe_error.group(1) if safe_error else 'output_suppressed')
print('PASS real Auth + JS mapper/controller import A/B, timeout replay and plan references')
code,refreshed=call('/auth/v1/token?grant_type=refresh_token',{'refresh_token':A['refresh_token']});assert code==200
code,_=call('/auth/v1/logout?scope=local',{},refreshed['access_token']);assert code in (200,204)
code,_=call('/auth/v1/token?grant_type=refresh_token',{'refresh_token':refreshed['refresh_token']});assert code>=400
print('PASS real Auth: captured email OTP, wrong OTP, verify A/B, private RPC isolation, atomic import/replay/finish with real A/B sessions, refresh, logout/revoked refresh')
