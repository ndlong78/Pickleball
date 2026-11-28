"""Video analysis store (ADR-0007) over verified loopback REST/PostgreSQL. No cloud input."""
import concurrent.futures, uuid, unittest
import test_backend as backend
from test_backend import sql, quote

def analysis(**overrides):
    base = {'analysis_version': 'ready-v1', 'skill': 'position', 'status': 'ok', 'view_kind': 'side',
            'knee_angle': 168.4, 'hip_angle': 150, 'stance_ratio': None, 'hand_height': 0.05,
            'finding_primary': 'knee_straight', 'finding_secondary': 'hands_low',
            'frames_total': 40, 'frames_valid': 36, 'engine': 'mediapipe-1.2.3-pose_landmarker_lite',
            'occurred_at': '2026-11-28T03:00:00Z'}
    base.update(overrides)
    return base

class VideoTests(unittest.TestCase):
    setUpClass = backend.BackendTests.__dict__['setUpClass']
    setUp = backend.BackendTests.setUp
    tearDown = backend.BackendTests.tearDown
    request = backend.BackendTests.request

    def rpc(self, name, args, token=None):
        code, result = self.request('rpc/' + name, args, token or self.token_a)
        self.assertEqual(code, 200, result)
        return result

    def record(self, event=None, token=None, **overrides):
        return self.rpc('record_video_analysis', {'p_client_event_id': event or str(uuid.uuid4()), 'p_payload': analysis(**overrides)}, token)

    def test_record_replay_list_delete_and_isolation(self):
        event = str(uuid.uuid4())
        first = self.record(event)
        self.assertEqual(first['status'], 'applied')
        self.assertFalse(first['replayed'])
        self.assertEqual(first['row']['knee_angle'], 168.4)
        self.assertNotIn('user_id', first['row'])
        self.assertNotIn('request_hash', first['row'])
        self.assertTrue(self.record(event)['replayed'])
        self.assertEqual(self.record(event, knee_angle=140)['code'], 'operation_id_reused')
        rows = self.rpc('list_video_analyses', {})['rows']
        self.assertEqual([r['id'] for r in rows], [first['row']['id']])
        # B sees nothing of A, cannot delete A's row, and its own event ids are independent.
        self.assertEqual(self.rpc('list_video_analyses', {}, self.token_b)['rows'], [])
        self.assertEqual(self.request('video_analyses', token=self.token_b)[1], [])
        self.assertEqual(self.rpc('delete_video_analysis', {'p_id': first['row']['id']}, self.token_b)['status'], 'not_found')
        self.assertFalse(self.record(event, self.token_b)['replayed'])
        self.assertEqual(len(self.request('video_analyses', token=self.token_a)[1]), 1)
        self.assertEqual(self.rpc('delete_video_analysis', {'p_id': first['row']['id']})['status'], 'deleted')
        self.assertEqual(self.rpc('list_video_analyses', {})['rows'], [])
        self.assertEqual(len(self.rpc('list_video_analyses', {}, self.token_b)['rows']), 1)

    def test_anonymous_and_direct_writes_are_refused(self):
        for name, args in [('record_video_analysis', {'p_client_event_id': str(uuid.uuid4()), 'p_payload': analysis()}),
                           ('list_video_analyses', {}), ('delete_video_analysis', {'p_id': str(uuid.uuid4())})]:
            with self.subTest(rpc=name):
                code, result = self.request('rpc/' + name, args)
                self.assertIn(code, (401, 403))
                self.assertEqual(result['code'], '42501')
        code, result = self.request('video_analyses')
        self.assertIn(code, (401, 403))
        self.record()
        for method, payload in [('POST', {'user_id': self.a, 'client_event_id': str(uuid.uuid4())}), ('PATCH', {'knee_angle': 1}), ('DELETE', None)]:
            with self.subTest(method=method):
                code, result = self.request('video_analyses?user_id=eq.' + self.a, payload, self.token_a, method)
                self.assertEqual(code, 403)
                self.assertEqual(result['code'], '42501')
        self.assertEqual(len(self.rpc('list_video_analyses', {})['rows']), 1)

    def test_invalid_payloads_leak_no_details(self):
        cases = {'landmarks': {'landmarks': []}, 'skill': {'skill': 'smash'}, 'angle': {'knee_angle': 400},
                 'string number': {'knee_angle': '168'}, 'frames': {'frames_valid': 50}, 'engine': {'engine': 'a · b'}}
        for label, override in cases.items():
            with self.subTest(case=label):
                result = self.rpc('record_video_analysis', {'p_client_event_id': str(uuid.uuid4()), 'p_payload': {**analysis(), **override}})
                self.assertEqual(result['status'], 'invalid')
                self.assertIn(result['code'], ('invalid_request', 'constraint'))
                self.assertEqual(set(result), {'status', 'code'})
        self.assertEqual(self.rpc('list_video_analyses', {})['rows'], [])

    def test_concurrent_records_respect_quota_and_idempotency(self):
        # 1998 existing rows; four concurrent new events and one duplicate pair: exactly two fit.
        sql("insert into public.video_analyses(user_id,client_event_id,request_hash,occurred_at,analysis_version,skill,status,frames_total,frames_valid,engine) "
            "select " + quote(self.a) + ",gen_random_uuid(),repeat('a',64),'2026-11-01','ready-v1','position','insufficient',0,0,'x' from generate_series(1,1998);")
        events = [str(uuid.uuid4()) for _ in range(4)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda e: self.record(e), events))
        statuses = sorted(r['status'] for r in results)
        self.assertEqual(statuses, ['applied', 'applied', 'quota_exceeded', 'quota_exceeded'])
        count = sql('select count(*) from public.video_analyses where user_id=' + quote(self.a) + ';')
        self.assertIn('2000', ''.join(count))
        self.assertEqual(self.record(str(uuid.uuid4()), self.token_b)['status'], 'applied')

if __name__ == '__main__':
    unittest.main()
