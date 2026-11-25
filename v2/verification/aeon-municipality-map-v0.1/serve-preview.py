#!/usr/bin/env python3
"""Serve the verification map from its checkout or a local preview bundle."""
import argparse
from functools import lru_cache
import gzip
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote, urlsplit

HERE = Path(__file__).resolve().parent
PREVIEW_PATH = "/v2/verification/aeon-municipality-map-v0.1/"
VIEWPORT_PATH = "/v2/progressive-preview/map-viewport.js"


@lru_cache(maxsize=8)
def compressed(path, last_modified):
    return gzip.compress(path.read_bytes(), compresslevel=5, mtime=0)


class PreviewHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        requested = unquote(urlsplit(path).path)
        if requested == VIEWPORT_PATH:
            repo_viewport = HERE / "../../.." / VIEWPORT_PATH.lstrip("/")
            bundled_viewport = HERE / VIEWPORT_PATH.lstrip("/")
            return str(repo_viewport.resolve() if repo_viewport.is_file() else bundled_viewport)
        if requested.startswith(PREVIEW_PATH):
            requested = requested.removeprefix(PREVIEW_PATH)
        name = requested.strip("/") or "index.html"
        target = (HERE / name).resolve()
        if target.is_relative_to(HERE) and target.is_file():
            return str(target)
        return str(HERE / ".file-not-found")

    def end_headers(self):
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        super().end_headers()

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.suffix == ".json" and path.is_file() and "gzip" in self.headers.get("Accept-Encoding", ""):
            payload = compressed(path, path.stat().st_mtime_ns)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            return BytesIO(payload)
        return super().send_head()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    if not (HERE / "data/geometry/overview.json").is_file():
        raise SystemExit("Run prepare-geometry.py before serving the map.")
    with ThreadingHTTPServer((args.bind, args.port), PreviewHandler) as server:
        print(f"http://{args.bind}:{args.port}{PREVIEW_PATH}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
