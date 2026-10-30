"""Real loopback GoTrue + Mailpit + RPC integration. Never print credentials/codes."""
import json, subprocess, time, re, uuid, urllib.request, urllib.error
status=json.loads(subprocess.check_output(['supabase','status','-o','json'],stderr=subprocess.DEVNULL))
base=status['API_URL']
assert base=='http://127.0.0.1:54321'
key=status['ANON_KEY']
def call(path,data=None,token=None):
    req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req) as r:return r.status,json.load(r)
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
for session,name in [(A,'A'),(B,'B')]:
    code,result=call('/rest/v1/rpc/apply_operation',{'p_operation_id':str(uuid.uuid4()),'p_kind':'profiles','p_entity_key':'self','p_action':'put','p_expected_revision':'0','p_payload':{'display_name':name,'timezone':'Asia/Ho_Chi_Minh'},'p_protocol_version':1},session['access_token'])
    assert code==200 and result['status']=='applied'
    code,result=call('/rest/v1/rpc/pull_changes',{},session['access_token']);assert code==200 and result['status']=='ok'
    assert all(c['row']['user_id']==session['user']['id'] for c in result['changes'])
code,refreshed=call('/auth/v1/token?grant_type=refresh_token',{'refresh_token':A['refresh_token']});assert code==200
code,_=call('/auth/v1/logout?scope=local',{},refreshed['access_token']);assert code in (200,204)
code,_=call('/auth/v1/token?grant_type=refresh_token',{'refresh_token':refreshed['refresh_token']});assert code>=400
print('PASS real Auth: captured email OTP, wrong OTP, verify A/B, private RPC isolation, refresh, logout/revoked refresh')
