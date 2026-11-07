"""Static host; browser tests can opt into an isolated guest Auth fixture."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from io import BytesIO
from pathlib import Path

GUEST_AUTH = b'window.PICKLEUP_AUTH_CONFIG = Object.freeze({enabled:false,url:"",publishableKey:""});\n'

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        # Serve SW fetches and page fetches through the same HTTP fixture.
        if (getattr(self.server, 'guest_auth', False) and
                Path(self.translate_path(self.path)).resolve() ==
                (Path(self.directory) / 'modules/auth-config.js').resolve()):
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
            self.send_header('Content-Length', str(len(GUEST_AUTH)))
            self.end_headers()
            return BytesIO(GUEST_AUTH)
        return super().send_head()

    def translate_path(self,path):
        if path.startswith('/Pickleball/'):
            path=path[len('/Pickleball'):]
        return super().translate_path(path)

def create_server(*, guest_auth=False, port=4173, directory=None):
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=directory))
    server.guest_auth = guest_auth
    return server

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--guest-auth', action='store_true',
                        help='Serve disabled Auth configuration for browser regression tests.')
    parser.add_argument('--directory', default=None,
                        help='Static document root (use dist for Cloudflare build regression).')
    args = parser.parse_args()
    with create_server(guest_auth=args.guest_auth, directory=args.directory) as server:
        server.serve_forever()

if __name__ == '__main__':
    main()
