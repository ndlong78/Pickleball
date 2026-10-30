"""Static test host emulates the GitHub Pages /Pickleball/ prefix."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        if path.startswith('/Pickleball/'):
            path=path[len('/Pickleball'):]
        return super().translate_path(path)
ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
