"""Vercel serverless function: resolve a URL to its downloadable streams.

Deliberately metadata-only. Vercel functions have a 60s ceiling and no
persistent disk, so proxying video bytes through here would fail on anything
sizable. Instead we return the direct stream URLs and let the browser fetch
from the origin CDN — no middleman, no egress bill, no timeout.
"""

from __future__ import annotations

import ipaddress
import json
import os
import socket
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

# The shared error taxonomy lives in the CLI package one level up.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vdl.errors import classify  # noqa: E402

MAX_BODY_BYTES = 8 * 1024
MAX_FORMATS = 40


class UrlRejected(ValueError):
    """Input failed validation before any network call was made."""


def validate(raw: str) -> str:
    """Reject anything that is not a public http(s) URL.

    yt-dlp will happily fetch whatever it is handed, so an unvalidated URL
    turns this function into an SSRF gadget pointed at Vercel's internal
    network. Scheme and resolved-IP checks both happen before extraction.
    """
    if not raw or not isinstance(raw, str):
        raise UrlRejected("no URL supplied")
    raw = raw.strip()
    if len(raw) > 2048:
        raise UrlRejected("URL too long")

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https"):
        raise UrlRejected("only http and https URLs are accepted")
    if not parsed.hostname:
        raise UrlRejected("URL has no host")

    for family, _, _, _, address in _resolve(parsed.hostname):
        ip = ipaddress.ip_address(address[0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast):
            raise UrlRejected("host resolves to a non-public address")
    return raw


def _resolve(hostname: str):
    try:
        return socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise UrlRejected(f"cannot resolve host: {hostname}") from exc


def _kind(fmt: dict) -> str:
    """Classify a stream as progressive / video-only / audio-only.

    yt-dlp signals an absent track with the literal string "none". A missing
    key or None means the extractor never probed it — common for direct file
    URLs via the generic extractor — so absence of information is treated as
    "present", not "absent". Reading None as absent mislabels a plain .avi
    download as audio-only.
    """
    has_video = fmt.get("vcodec") != "none"
    has_audio = fmt.get("acodec") != "none"
    if has_video and has_audio:
        return "progressive"  # ready to play as-is
    return "video" if has_video else "audio"


def _label(fmt: dict) -> str:
    """Human-facing quality label, derived from whatever the extractor knew."""
    if fmt.get("resolution"):
        return fmt["resolution"]
    if fmt.get("height"):
        return f"{fmt.get('width') or '?'}x{fmt['height']}"
    return "audio only" if _kind(fmt) == "audio" else "source file"


def _rank(fmt: dict) -> tuple:
    """Best first: progressive streams, then by height, then by bitrate."""
    order = {"progressive": 0, "video": 1, "audio": 2}
    return (
        order.get(_kind(fmt), 3),
        -(fmt.get("height") or 0),
        -(fmt.get("tbr") or 0),
    )


def extract(url: str) -> dict:
    """Probe the URL and shape the response for the client."""
    import yt_dlp

    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": 20,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False) or {}

    # A playlist URL yields entries instead of formats; surface the first item.
    if info.get("_type") == "playlist" and info.get("entries"):
        info = info["entries"][0] or {}

    usable = [f for f in info.get("formats", []) if f.get("url")]
    usable.sort(key=_rank)

    formats = [
        {
            "format_id": f.get("format_id"),
            "ext": f.get("ext"),
            "resolution": _label(f),
            "fps": f.get("fps"),
            "vcodec": f.get("vcodec"),
            "acodec": f.get("acodec"),
            "filesize": f.get("filesize") or f.get("filesize_approx"),
            "tbr": f.get("tbr"),
            "kind": _kind(f),
            "note": f.get("format_note"),
            "url": f.get("url"),
        }
        for f in usable[:MAX_FORMATS]
    ]

    return {
        "title": info.get("title") or "untitled",
        "uploader": info.get("uploader") or info.get("channel"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "extractor": info.get("extractor_key"),
        "webpage_url": info.get("webpage_url") or url,
        "formats": formats,
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802 - name fixed by BaseHTTPRequestHandler
        self._respond(204, {})

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("content-length") or 0)
        except ValueError:
            return self._respond(400, {"error": "invalid content-length"})
        if length > MAX_BODY_BYTES:
            return self._respond(413, {"error": "request body too large"})

        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            url = validate(payload.get("url", ""))
        except UrlRejected as exc:
            return self._respond(400, {"error": str(exc)})
        except (ValueError, AttributeError):
            return self._respond(400, {"error": "malformed JSON body"})

        try:
            return self._respond(200, extract(url))
        except Exception as exc:  # classify so the UI can explain the real cause
            message = str(exc)
            kind = classify(message)
            status = 404 if kind.__name__ == "NotFoundError" else 422
            return self._respond(status, {"error": message, "kind": kind.__name__})

    def _respond(self, status: int, body: dict) -> None:
        encoded = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "content-type")
        self.send_header("access-control-allow-methods", "POST, OPTIONS")
        self.end_headers()
        if status != 204:
            self.wfile.write(encoded)

    def log_message(self, *args) -> None:
        """Silence per-request stderr noise; Vercel logs requests already."""
