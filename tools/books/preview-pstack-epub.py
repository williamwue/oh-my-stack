#!/usr/bin/env python3
"""Serve actual EPUBs in a pinned epub.js reader on loopback for visual QA.

Install viewer dependencies into .tmp with:
npm install --prefix .tmp/epub-reading-20261013/reader-deps epubjs@0.3.93 jszip@3.10.1
"""
import argparse
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


class Handler(BaseHTTPRequestHandler):
    def __init__(self, *args, routes, **kwargs):
        self.routes = routes
        super().__init__(*args, **kwargs)

    def do_GET(self):
        route = self.routes.get(urlsplit(self.path).path)
        if not route or not route[0].is_file():
            self.send_error(404)
            return
        data = route[0].read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', route[1])
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8974)
    parser.add_argument('--deps', type=Path, default=ROOT / '.tmp/epub-reading-20261013/reader-deps/node_modules')
    args = parser.parse_args()
    routes = {'/': (ROOT / 'tools/books/preview-pstack-epub.html', 'text/html; charset=utf-8'),
              '/epub.min.js': (args.deps / 'epubjs/dist/epub.min.js', 'application/javascript'),
              '/jszip.min.js': (args.deps / 'jszip/dist/jszip.min.js', 'application/javascript')}
    for lang in ['zh-CN', 'en']:
        for suffix in ['', '-sample']:
            filename = f'pstack-{lang}{suffix}.epub'
            routes['/' + filename] = (ROOT / 'output/epub' / filename, 'application/epub+zip')
    for name in ['/epub.min.js', '/jszip.min.js']:
        if not routes[name][0].is_file():
            parser.error('Missing pinned reader dependency: ' + str(routes[name][0]))
    print(f'EPUB QA reader: http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, routes=routes)).serve_forever()
