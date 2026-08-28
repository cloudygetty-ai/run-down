"""Tests for the Vercel resolve function — input validation above all.

The handler hands attacker-controlled URLs to yt-dlp, so `validate` is the
security boundary of the whole deployment. It gets the most coverage here.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.resolve import UrlRejected, _kind, _label, _rank, validate  # noqa: E402


@pytest.fixture
def public_dns(monkeypatch):
    """Resolve every hostname to a public address unless a test says otherwise."""
    monkeypatch.setattr(
        "api.resolve._resolve",
        lambda host: [(2, 1, 6, "", ("93.184.216.34", 0))],
    )


def test_accepts_public_https_url(public_dns):
    assert validate("https://example.com/watch?v=1") == "https://example.com/watch?v=1"


def test_strips_surrounding_whitespace(public_dns):
    assert validate("  https://example.com/v  ") == "https://example.com/v"


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "ftp://example.com/v.mp4",
        "gopher://example.com/",
        "javascript:alert(1)",
        "data:text/html,<script>",
    ],
)
def test_rejects_non_http_schemes(public_dns, url):
    with pytest.raises(UrlRejected, match="http and https"):
        validate(url)


@pytest.mark.parametrize("url", ["", "   ", None, 12345])
def test_rejects_empty_or_non_string(url):
    with pytest.raises(UrlRejected):
        validate(url)


def test_rejects_overlong_url(public_dns):
    with pytest.raises(UrlRejected, match="too long"):
        validate("https://example.com/" + "a" * 2100)


def test_rejects_url_without_host(public_dns):
    with pytest.raises(UrlRejected, match="no host"):
        validate("https:///path-only")


@pytest.mark.parametrize(
    "address",
    [
        "127.0.0.1",        # loopback
        "10.0.0.5",         # private
        "192.168.1.1",      # private
        "172.16.0.1",       # private
        "169.254.169.254",  # cloud metadata endpoint
        "0.0.0.0",          # reserved
        "224.0.0.1",        # multicast
    ],
)
def test_rejects_internal_addresses(monkeypatch, address):
    # SSRF guard: a public hostname may still resolve to internal space.
    monkeypatch.setattr(
        "api.resolve._resolve", lambda host: [(2, 1, 6, "", (address, 0))]
    )
    with pytest.raises(UrlRejected, match="non-public"):
        validate("https://sneaky.example.com/v")


def test_rejects_ipv6_loopback(monkeypatch):
    monkeypatch.setattr("api.resolve._resolve", lambda host: [(10, 1, 6, "", ("::1", 0))])
    with pytest.raises(UrlRejected, match="non-public"):
        validate("https://localhost6/v")


def test_rejects_when_any_resolved_address_is_internal(monkeypatch):
    # DNS returning one public and one internal address must still be refused.
    monkeypatch.setattr(
        "api.resolve._resolve",
        lambda host: [(2, 1, 6, "", ("93.184.216.34", 0)), (2, 1, 6, "", ("127.0.0.1", 0))],
    )
    with pytest.raises(UrlRejected, match="non-public"):
        validate("https://rebind.example.com/v")


def test_unresolvable_host_is_rejected(monkeypatch):
    # Patch getaddrinfo rather than _resolve, so _resolve's own gaierror
    # handling is what the test actually exercises.
    import socket

    def boom(*args, **kwargs):
        raise socket.gaierror("nope")

    monkeypatch.setattr("api.resolve.socket.getaddrinfo", boom)
    with pytest.raises(UrlRejected, match="cannot resolve"):
        validate("https://nx.example.com/v")


@pytest.mark.parametrize(
    "fmt, expected",
    [
        ({"vcodec": "avc1", "acodec": "mp4a"}, "progressive"),
        ({"vcodec": "avc1", "acodec": "none"}, "video"),
        ({"vcodec": "none", "acodec": "mp4a"}, "audio"),
        # Unprobed codecs (generic extractor on a direct file URL) must read as
        # a complete file, not audio-only.
        ({}, "progressive"),
        ({"vcodec": None, "acodec": None}, "progressive"),
        ({"vcodec": None, "acodec": "none"}, "video"),
    ],
)
def test_stream_kind_classification(fmt, expected):
    assert _kind(fmt) == expected


@pytest.mark.parametrize(
    "fmt, expected",
    [
        ({"resolution": "1920x1080"}, "1920x1080"),
        ({"width": 640, "height": 360}, "640x360"),
        ({"height": 720}, "?x720"),
        ({"vcodec": "none", "acodec": "mp4a"}, "audio only"),
        # Unprobed direct file: never claim "audio only" just because height
        # is unknown — that is what the generic extractor returns.
        ({}, "source file"),
    ],
)
def test_quality_label(fmt, expected):
    assert _label(fmt) == expected


def test_ranking_puts_progressive_and_tallest_first():
    formats = [
        {"vcodec": "avc1", "acodec": "none", "height": 1080},
        {"vcodec": "none", "acodec": "mp4a", "height": None},
        {"vcodec": "avc1", "acodec": "mp4a", "height": 720},
        {"vcodec": "avc1", "acodec": "none", "height": 2160},
    ]
    ordered = sorted(formats, key=_rank)
    assert _kind(ordered[0]) == "progressive"
    assert ordered[1]["height"] == 2160  # tallest video-only next
    assert _kind(ordered[-1]) == "audio"
