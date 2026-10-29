#!/usr/bin/env python3
"""Real local Supabase REST + PostgreSQL concurrency tests. Stdlib only; no remote DB input."""
import base64
import concurrent.futures
import hashlib
import hmac
import json
import os
import select
import shutil
import subprocess
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid

STANDALONE = '--standalone' in __import__('sys').argv
if STANDALONE: __import__('sys').argv.remove('--standalone')
CONTAINER = 'pickleup-pr1a-postgres' if STANDALONE else 'supabase_db_pickleup-v6'
# Prevent an inherited Docker context/TLS selector redirecting this local-only harness.
for selector in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'):
    os.environ.pop(selector, None)
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
PSQL = DOCKER + ['exec', '-i', CONTAINER, 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1']
PUBLIC_TABLES = ['profiles', 'user_preferences', 'personal_plans', 'academy_attempts', 'skill_assessments',
                 'legacy_score_snapshots', 'practice_checkins', 'training_entries', 'match_records',
                 'user_selections', 'legacy_imports', 'legacy_import_items']


def sql(statement):
    r = subprocess.run(PSQL, input=statement, text=True, capture_output=True, timeout=30)
    if r.returncode:
        raise AssertionError('Local SQL failed: ' + r.stderr)
    return [line for line in r.stdout.splitlines() if line.strip()]


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def claims(uid):
    return "set local role authenticated; select set_config('request.jwt.claims'," + quote(json.dumps({'sub': uid, 'role': 'authenticated'})) + ",true);"


def op_sql(uid, kind, key, revision, payload=None, action='put', operation_id=None):
    operation_id = operation_id or str(uuid.uuid4())
    args = [operation_id, kind, key, action, str(revision), json.dumps(payload or {}, ensure_ascii=False)]
    return "select public.apply_operation(" + ','.join(quote(a) for a in args) + ',1);'


def jwt(secret, uid):
    def enc(data):
        return base64.urlsafe_b64encode(json.dumps(data, separators=(',', ':')).encode()).rstrip(b'=')
    message = enc({'alg': 'HS256', 'typ': 'JWT'}) + b'.' + enc({'sub': uid, 'role': 'authenticated', 'aud': 'authenticated', 'iss': 'supabase', 'iat': int(time.time()), 'exp': int(time.time()) + 1800})
    return (message + b'.' + base64.urlsafe_b64encode(hmac.new(secret.encode(), message, hashlib.sha256).digest()).rstrip(b'=')).decode()


def plan():
    skills = ['serve', 'return', 'dink', 'volley', 'position', 'strategy']
    return {'source': 'basic', 'schema_version': 1, 'level_band': '1.0–2.0', 'plan_snapshot': {
        'id': 'synthetic-plan', 'version': '2.4', 'createdAt': '2026-01-01T10:00:00Z', 'level': '1.0–2.0',
        'scores': dict.fromkeys(skills, 12), 'exercises': [
            {'id': skill + '-1', 'skill': skill, 'name': 'Synthetic drill', 'setup': 'Synthetic',
             'instructions': 'Synthetic', 'measure': 'Synthetic', 'mistake': 'Synthetic', 'skillName': skill,
             'minutes': mins, 'baseline': 12, 'target': 15} for skill, mins in zip(skills, [12, 12, 15])],
        'minutes': {'warmup': 10, 'drills': [12, 12, 15], 'assessment': 6, 'cooldown': 5},
        'checkpoint': {'skill': 'serve', 'baseline': 12, 'target': 15, 'attempts': 20}, 'completedAt': None, 'checkScore': None}}


class BackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Hard-coded Docker socket/container + CLI loopback URL; no DATABASE_URL or project_ref accepted.
        info = subprocess.check_output(DOCKER + ['inspect', '--format', '{{.Config.Labels}}', CONTAINER], text=True)
        if not STANDALONE and 'pickleup-v6' not in info:

            raise RuntimeError('Refusing non-local/unidentified database')
        if STANDALONE:
            # Explicit local fallback only: real PG17/PostgREST, minimal Auth SQL fixture.
            # CI does not use this mode; it tests full Supabase local.
            secret = 'pickleup-pr1a-standalone-jwt-secret-at-least-32-chars'
            config = {'API_URL': 'http://127.0.0.1:54321', 'JWT_SECRET': secret}
            # anon JWT uses the same signing algorithm but no authenticated role.
            def enc(x): return base64.urlsafe_b64encode(json.dumps(x).encode()).rstrip(b'=')
            msg = enc({'alg':'HS256','typ':'JWT'}) + b'.' + enc({'role':'anon','exp':int(time.time())+3600})
            config['ANON_KEY'] = (msg + b'.' + base64.urlsafe_b64encode(hmac.new(secret.encode(),msg,hashlib.sha256).digest()).rstrip(b'=')).decode()
        else:
            cli = os.environ.get('SUPABASE_CLI', shutil.which('supabase') or 'supabase')
            status = subprocess.run([cli, 'status', '-o', 'json'], text=True, capture_output=True, check=True)
            config = json.loads(status.stdout)
        url = urllib.parse.urlparse(config['API_URL'])
        if url.hostname not in ('127.0.0.1', 'localhost') or url.port != 54321 or url.scheme != 'http':
            raise RuntimeError('Refusing non-loopback Supabase API')
        cls.api = config['API_URL'] + ('/' if STANDALONE else '/rest/v1/')
        cls.anon = config['ANON_KEY']
        cls.secret = config['JWT_SECRET']
        # Preserve proxy for external tools; HTTP loopback test traffic uses a dedicated direct opener.
        cls.http = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def setUp(self):
        self.held_processes = []
        self.a, self.b = str(uuid.uuid4()), str(uuid.uuid4())
        sql('insert into auth.users(id,email) values(' + quote(self.a) + ',' + quote(self.a + '@pickleup.invalid') + '),(' + quote(self.b) + ',' + quote(self.b + '@pickleup.invalid') + ');')
        self.token_a, self.token_b = jwt(self.secret, self.a), jwt(self.secret, self.b)

    def tearDown(self):
        for process in self.held_processes:
            if process.poll() is None:
                process.stdin.write('rollback;\n\\q\n')
                process.stdin.flush()
                process.communicate(timeout=10)
        # Only these synthetic test UUIDs in a verified local container; cascades exercise ownership FKs.
        sql('delete from auth.users where id in (' + quote(self.a) + ',' + quote(self.b) + ');')

    def request(self, path, payload=None, token=None, method=None):
        req = urllib.request.Request(self.api + path, data=None if payload is None else json.dumps(payload).encode(),
                                     method=method or ('GET' if payload is None else 'POST'), headers={
                                         'apikey': self.anon, 'Authorization': 'Bearer ' + (token or self.anon), 'Content-Type': 'application/json'})
        try:
            with self.http.open(req, timeout=20) as r:
                raw = r.read()
                return r.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def op(self, kind, key='self', rev=0, payload=None, action='put', opid=None, token=None):
        status, result = self.request('rpc/apply_operation', {
            'p_operation_id': opid or str(uuid.uuid4()), 'p_kind': kind, 'p_entity_key': key, 'p_action': action,
            'p_expected_revision': str(rev), 'p_payload': payload or {}, 'p_protocol_version': 1}, token or self.token_a)
        self.assertEqual(status, 200, result)
        return result

    def pull(self, after='0', limit=100, high=None, epoch=None, token=None):
        status, result = self.request('rpc/pull_changes', {
            'p_after_revision': after, 'p_limit': limit, 'p_high_water': high, 'p_epoch': epoch}, token or self.token_a)
        self.assertEqual(status, 200, result)
        return result

    def begin_held(self, statement):
        process = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        self.held_processes.append(process)
        process.stdin.write('begin; ' + claims(self.a) + statement + '\n\\echo LOCK_HELD\n')
        process.stdin.flush()
        # select() bounds the wait even if the SQL unexpectedly fails before the marker.
        deadline = time.monotonic() + 20
        result = None
        buffered = b''
        while time.monotonic() < deadline:
            ready, _, _ = select.select([process.stdout], [], [], 0.2)
            if not ready:
                if process.poll() is not None:
                    raise AssertionError('Held transaction failed: ' + process.stderr.read())
                continue
            chunk = os.read(process.stdout.fileno(), 65536)
            if not chunk:
                raise AssertionError('Held transaction exited: ' + process.stderr.read())
            buffered += chunk
            if b'LOCK_HELD\n' in buffered:
                for line in buffered.decode().splitlines():
                    if line.startswith('{') and 'status' in line:
                        result = json.loads(line)
                return process, result
        process.kill()
        raise AssertionError('Timed out acquiring local transaction lock')

    def finish_held(self, process, command):
        process.stdin.write(command + ';\n\\q\n')
        process.stdin.flush()
        process.communicate(timeout=20)
        self.assertEqual(process.returncode, 0)

    def wait_for_lock(self, name):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if sql("select count(*) from pg_stat_activity where application_name=" + quote(name) + " and wait_event_type='Lock';")[-1] == '1':
                return
            time.sleep(0.03)
        self.fail('Concurrent transaction never waited on the server lock')

    def concurrent_sql(self, name, statement):
        result = sql('set application_name=' + quote(name) + '; begin; ' + claims(self.a) + statement + ' commit;')
        return next(json.loads(line) for line in result if line.startswith('{') and 'status' in line)

    def test_rest_rls_and_direct_write_matrix(self):
        self.assertEqual(self.op('user_preferences', payload={'target_days': 2})['status'], 'applied')
        for table in PUBLIC_TABLES:
            with self.subTest(table=table, role='anon'):
                code, result = self.request(table)
                self.assertIn(code, (401, 403))
                self.assertEqual(result['code'], '42501')
            for method, payload in [('POST', {'user_id': self.a}), ('PATCH', {'user_id': self.b}), ('DELETE', None)]:
                with self.subTest(table=table, method=method):
                    code, result = self.request(table + '?user_id=eq.' + self.a, payload, self.token_a, method)
                    self.assertEqual(code, 403)
                    self.assertEqual(result['code'], '42501')
        self.assertEqual(self.request('user_preferences', token=self.token_b)[1], [])
        self.assertEqual(len(self.request('user_preferences', token=self.token_a)[1]), 1)
        self.assertEqual(self.pull(token=self.token_b)['changes'], [])
        for rpc in ['pull_changes', 'apply_operation']:
            payload = {} if rpc == 'pull_changes' else {'p_operation_id': str(uuid.uuid4()), 'p_kind': 'profiles', 'p_entity_key': 'self', 'p_action': 'put', 'p_expected_revision': '0'}
            code, result = self.request('rpc/' + rpc, payload)
            self.assertIn(code, (401, 403))
            self.assertEqual(result['code'], '42501')
        self.assertEqual(self.op('user_preferences', payload={'user_id': self.b})['status'], 'invalid')

    def test_rest_cross_owner_reference_and_plan_snapshot(self):
        key = str(uuid.uuid4())
        self.assertEqual(self.op('personal_plans', key, payload=plan(), token=self.token_b)['status'], 'applied')
        self.assertEqual(self.op('user_selections', payload={'selected_personal_plan_id': key})['status'], 'invalid')
        own = str(uuid.uuid4())
        self.assertEqual(self.op('personal_plans', own, payload=plan())['status'], 'applied')
        self.assertEqual(self.op('user_selections', payload={'selected_personal_plan_id': own})['status'], 'applied')
        self.assertEqual(self.op('personal_plans', own, 1, action='delete')['status'], 'invalid')
        self.assertEqual(self.op('personal_plans', own, 1, {'check_score': 15, 'completed_at': '2026-01-01T12:00:00Z'})['status'], 'applied')
        changed = plan()['plan_snapshot']; changed['scores']['serve'] = 20
        self.assertEqual(self.op('personal_plans', own, 2, {'plan_snapshot': changed})['status'], 'invalid')
        self.assertEqual(self.op('user_selections', rev=1, payload={'selected_personal_plan_id': None})['status'], 'applied')
        self.assertEqual(self.op('personal_plans', own, 2, action='delete')['status'], 'applied')
        self.assertEqual(self.op('user_selections', rev=2, payload={'selected_personal_plan_id': own})['status'], 'invalid')

    def test_rest_foreign_record_mutation_has_no_row_leak(self):
        key = str(uuid.uuid4())
        self.assertEqual(self.op('personal_plans', key, payload=plan())['status'], 'applied')
        for action, payload in [('put', {'check_score': 20}), ('delete', {})]:
            result = self.op('personal_plans', key, 1, payload, action=action, token=self.token_b)
            self.assertEqual(result['status'], 'conflict')
            self.assertIsNone(result.get('row'))
        rows = self.request('personal_plans', token=self.token_a)[1]
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]['check_score'])
        self.assertIsNone(rows[0]['deleted_at'])
        # Same UUID in B's namespace is legal and cannot modify A's entity.
        self.assertEqual(self.op('personal_plans', key, payload=plan(), token=self.token_b)['status'], 'applied')

    def test_rest_tombstone_and_explicit_restore(self):
        key = '2026-01-01'
        self.assertEqual(self.op('practice_checkins', key, payload={'status': 'done', 'minutes': 45, 'timezone_at_entry': 'Asia/Ho_Chi_Minh'})['status'], 'applied')
        self.assertEqual(self.op('practice_checkins', key, 1, action='delete')['status'], 'applied')
        self.assertEqual(self.op('practice_checkins', key, 1, {'status': 'done', 'minutes': 60})['status'], 'conflict')
        self.assertEqual(self.op('practice_checkins', key, 2, {'status': 'done', 'minutes': 60})['code'], 'explicit_restore_required')
        restored = self.op('practice_checkins', key, 2, {'status': 'done', 'minutes': 60}, action='restore')
        self.assertEqual(restored['row']['revision'], '3')
        self.assertEqual(restored['row']['minutes'], 60)
        self.assertEqual(restored['status'], 'applied')
        self.assertIsNone(restored['row']['deleted_at'])

    def test_concurrent_same_revision_only_one_wins(self):
        held, first = self.begin_held(op_sql(self.a, 'user_preferences', 'self', 0, {'target_days': 2}))
        self.assertEqual(first['status'], 'applied')
        with concurrent.futures.ThreadPoolExecutor(1) as pool:
            other = pool.submit(self.concurrent_sql, 'pickleup-cas-test', op_sql(self.a, 'user_preferences', 'self', 0, {'target_days': 5}))
            self.wait_for_lock('pickleup-cas-test')
            self.assertEqual(self.pull()['changes'], [])  # Uncommitted counter/row invisible.
            self.finish_held(held, 'commit')
            second = other.result(timeout=20)
        self.assertEqual(second['status'], 'conflict')
        self.assertEqual(second['row']['target_days'], 2)
        self.assertEqual(self.pull()['high_water'], '1')

    def test_concurrent_same_operation_replays_once(self):
        opid = str(uuid.uuid4())
        statement = op_sql(self.a, 'profiles', 'self', 0, {'timezone': 'UTC'}, operation_id=opid)
        held, first = self.begin_held(statement)
        with concurrent.futures.ThreadPoolExecutor(1) as pool:
            other = pool.submit(self.concurrent_sql, 'pickleup-replay-test', statement)
            self.wait_for_lock('pickleup-replay-test')
            self.finish_held(held, 'commit')
            replay = other.result(timeout=20)
        self.assertEqual(first['status'], 'applied')
        self.assertTrue(replay['replayed'])
        self.assertEqual(replay['row'], first['row'])
        self.assertEqual(self.pull()['high_water'], '1')
        mismatch = self.op('profiles', payload={'timezone': 'Asia/Ho_Chi_Minh'}, opid=opid)
        self.assertEqual(mismatch['code'], 'operation_id_reused')

    def test_concurrent_rollback_does_not_lose_cursor_or_receipt(self):
        opid = str(uuid.uuid4())
        held, _ = self.begin_held(op_sql(self.a, 'profiles', 'self', 0, {'timezone': 'UTC'}, operation_id=opid))
        with concurrent.futures.ThreadPoolExecutor(1) as pool:
            other = pool.submit(self.concurrent_sql, 'pickleup-rollback-test', op_sql(self.a, 'user_preferences', 'self', 0, {'target_days': 2}))
            self.wait_for_lock('pickleup-rollback-test')
            self.assertEqual(self.pull()['changes'], [])
            self.finish_held(held, 'rollback')
            committed = other.result(timeout=20)
        self.assertEqual(committed['server_revision'], '1')
        retry = self.op('profiles', payload={'timezone': 'UTC'}, opid=opid)
        self.assertEqual(retry['status'], 'applied')
        self.assertFalse(retry['replayed'])
        self.assertEqual(retry['server_revision'], '2')
        self.assertEqual([c['server_revision'] for c in self.pull()['changes']], ['1', '2'])

    def test_pagination_fences_high_water_during_new_commits(self):
        self.assertEqual(self.op('user_preferences')['status'], 'applied')
        for revision in range(1, 5):
            self.assertEqual(self.op('user_preferences', rev=revision, payload={'target_days': revision})['status'], 'applied')
        page = self.pull(limit=1)
        high, epoch = page['high_water'], page['epoch']
        seen = page['changes'][:]
        self.assertEqual(high, '5')
        self.assertEqual(self.op('profiles', payload={'timezone': 'UTC'})['server_revision'], '6')
        while page['has_more']:
            page = self.pull(page['next_revision'], 1, high, epoch)
            self.assertEqual(page['high_water'], high)
            seen += page['changes']
        self.assertEqual([c['server_revision'] for c in seen], ['1', '2', '3', '4', '5'])
        tail = self.pull(page['next_revision'], 1, epoch=epoch)
        self.assertEqual([c['server_revision'] for c in tail['changes']], ['6'])
        self.assertEqual(self.pull('0', 1, '999999', epoch)['status'], 'invalid')
        self.assertEqual(self.pull('1')['status'], 'reset_required')
        sql('update pickleup_private.sync_heads set epoch=gen_random_uuid() where user_id=' + quote(self.a) + ';')
        self.assertEqual(self.pull('5', epoch=epoch)['status'], 'reset_required')

    def test_payload_caps_and_server_fields(self):
        for payload in [{'revision': 100}, {'updated_at': '2026-01-01T00:00:00Z'}, {'source_kind': 'legacy'}, {'target_days': '3'}, {'gentle': 1}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.op('user_preferences', payload=payload)['status'], 'invalid')
        self.assertEqual(self.op('profiles', payload={'timezone': 'UTC', 'display_name': 'x' * 262145})['status'], 'invalid')
        self.assertEqual(self.op('practice_checkins', '9999-01-01', payload={'status': 'done', 'minutes': 30, 'timezone_at_entry': 'UTC'})['status'], 'invalid')
        self.assertEqual(self.op('practice_checkins', '2026-01-01', payload={'status': 'done', 'minutes': 30})['status'], 'invalid')
        self.assertEqual(self.pull()['changes'], [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
