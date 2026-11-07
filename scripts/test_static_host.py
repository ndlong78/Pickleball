"""Exercise the local HTTP fixture with synthetic config, never a cloud project."""
from contextlib import contextmanager
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import unittest

from scripts.serve_test import create_server, GUEST_AUTH

class StaticHostTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'modules').mkdir()
        (self.root / 'pages').mkdir()
        self.config = self.root / 'modules/auth-config.js'
        self.actual = b'window.PICKLEUP_AUTH_CONFIG={enabled:true,url:"https://example.invalid",publishableKey:"sb_publishable_synthetic"};'
        self.config.write_bytes(self.actual)
        (self.root / 'pages/settings.html').write_bytes(b'<section>synthetic</section>')

    @contextmanager
    def host(self, *, guest_auth):
        with create_server(guest_auth=guest_auth, port=0, directory=self.root) as server:
            thread = Thread(target=lambda: server.serve_forever(poll_interval=0.01), daemon=True)
            thread.start()
            try:
                yield server.server_port
            finally:
                server.shutdown()
                thread.join(timeout=2)
                self.assertFalse(thread.is_alive())

    def request(self, port, path, method='GET'):
        connection = HTTPConnection('127.0.0.1', port, timeout=2)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_default_host_keeps_the_operator_configuration_at_root_and_prefix(self):
        with self.host(guest_auth=False) as port:
            for path in ['/modules/auth-config.js?v=fixture', '/Pickleball/modules/auth-config.js?v=fixture']:
                with self.subTest(path=path):
                    status, _, body = self.request(port, path)
                    self.assertEqual(status, 200)
                    self.assertEqual(body, self.actual)

    def test_guest_fixture_covers_get_head_and_service_worker_asset_paths_without_mutating_source(self):
        with self.host(guest_auth=True) as port:
            for path in ['/modules/auth-config.js?v=fixture', '/Pickleball/modules/auth-config.js?v=fixture', '/Pickleball/modules/../modules/auth-config.js']:
                for method in ['GET', 'HEAD']:
                    with self.subTest(path=path, method=method):
                        status, headers, body = self.request(port, path, method)
                        self.assertEqual(status, 200)
                        self.assertIn('application/javascript', headers['Content-Type'])
                        self.assertEqual(int(headers['Content-Length']), len(GUEST_AUTH))
                        self.assertEqual(body, GUEST_AUTH if method == 'GET' else b'')
        self.assertEqual(self.config.read_bytes(), self.actual)

    def test_guest_fixture_preserves_other_assets_and_does_not_mask_missing_files(self):
        with self.host(guest_auth=True) as port:
            for path in ['/pages/settings.html?v=fixture', '/Pickleball/pages/settings.html?v=fixture']:
                status, _, body = self.request(port, path)
                self.assertEqual(status, 200)
                self.assertEqual(body, b'<section>synthetic</section>')
            self.assertEqual(self.request(port, '/other/auth-config.js')[0], 404)

if __name__ == '__main__':
    unittest.main()
