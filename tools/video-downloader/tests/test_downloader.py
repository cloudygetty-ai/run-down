"""Downloader and batch behaviour, exercised against a fake yt-dlp.

No network access: `yt_dlp.YoutubeDL` is replaced with a stub whose scripted
outcomes let us assert retry, classification, and concurrency policy.
"""

from __future__ import annotations

import sys
import types

import pytest

from vdl import batch, downloader, errors
from vdl.config import DownloadConfig


class FakeYoutubeDL:
    """Stands in for yt_dlp.YoutubeDL. Outcomes are popped from a script."""

    script: list = []
    calls: list = []

    def __init__(self, opts):
        self.opts = opts

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def extract_info(self, url, download=True):
        FakeYoutubeDL.calls.append((url, download))
        outcome = FakeYoutubeDL.script.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        # Drive the progress hook so byte accounting is exercised too.
        for hook in self.opts.get("progress_hooks", []):
            hook({"status": "downloading", "downloaded_bytes": 512,
                  "total_bytes": 1024, "info_dict": outcome})
            hook({"status": "finished", "downloaded_bytes": 1024, "info_dict": outcome})
        return outcome


@pytest.fixture(autouse=True)
def fake_ytdlp(monkeypatch):
    module = types.ModuleType("yt_dlp")
    module.YoutubeDL = FakeYoutubeDL
    utils = types.ModuleType("yt_dlp.utils")
    utils.parse_duration = lambda text: float(text) if text else None
    module.utils = utils
    monkeypatch.setitem(sys.modules, "yt_dlp", module)
    monkeypatch.setitem(sys.modules, "yt_dlp.utils", utils)
    monkeypatch.setattr("time.sleep", lambda _: None)  # collapse backoff
    FakeYoutubeDL.script = []
    FakeYoutubeDL.calls = []
    yield


def info(title="Clip", path="/tmp/clip.mp4"):
    return {"title": title, "id": "abc123",
            "requested_downloads": [{"filepath": path}]}


def make(tmp_path, **kwargs) -> DownloadConfig:
    kwargs.setdefault("urls", ("https://example.com/v1",))
    kwargs.setdefault("output_dir", tmp_path)
    kwargs.setdefault("quiet", True)
    return DownloadConfig(**kwargs)


def test_successful_download_reports_path_and_bytes(tmp_path):
    FakeYoutubeDL.script = [info()]
    result = downloader.download("https://example.com/v1", make(tmp_path))
    assert result.status == "ok"
    assert result.title == "Clip"
    assert result.filepath == "/tmp/clip.mp4"
    assert result.bytes_downloaded == 1024
    assert result.attempts == 1


def test_network_failure_retries_then_succeeds(tmp_path):
    FakeYoutubeDL.script = [Exception("connection reset by peer"), info()]
    result = downloader.download("https://example.com/v1", make(tmp_path, retries=3))
    assert result.status == "ok"
    assert result.attempts == 2


def test_retries_are_bounded(tmp_path):
    FakeYoutubeDL.script = [Exception("connection reset") for _ in range(10)]
    result = downloader.download("https://example.com/v1", make(tmp_path, retries=2))
    assert result.status == "failed"
    assert result.attempts == 3  # initial attempt + 2 retries
    assert result.error_class == "NetworkError"


def test_protected_content_fails_without_retrying(tmp_path):
    FakeYoutubeDL.script = [Exception("This video is DRM protected"), info()]
    result = downloader.download("https://example.com/v1", make(tmp_path, retries=5))
    assert result.status == "failed"
    assert result.error_class == "ProtectedContentError"
    assert result.attempts == 1
    assert len(FakeYoutubeDL.calls) == 1


def test_none_result_is_treated_as_failure(tmp_path):
    FakeYoutubeDL.script = [None]
    result = downloader.download("https://example.com/v1", make(tmp_path))
    assert result.status == "failed"


def test_probe_does_not_download(tmp_path):
    FakeYoutubeDL.script = [info()]
    downloader.probe("https://example.com/v1", make(tmp_path))
    assert FakeYoutubeDL.calls == [("https://example.com/v1", False)]


def test_probe_raises_classified_error(tmp_path):
    FakeYoutubeDL.script = [Exception("Unsupported URL: https://example.com/v1")]
    with pytest.raises(errors.UnsupportedUrlError):
        downloader.probe("https://example.com/v1", make(tmp_path))


def test_batch_continues_past_a_failure(tmp_path):
    FakeYoutubeDL.script = [info("A"), Exception("This video is private"), info("C")]
    config = make(
        tmp_path,
        urls=("https://e.com/a", "https://e.com/b", "https://e.com/c"),
        concurrency=1,
    )
    metrics = batch.run(config)
    assert metrics.succeeded == 2
    assert metrics.failed == 1
    assert len(metrics.items) == 3


def test_batch_creates_output_directory(tmp_path):
    FakeYoutubeDL.script = [info()]
    target = tmp_path / "nested" / "clips"
    batch.run(make(tmp_path, output_dir=target))
    assert target.is_dir()


def test_metrics_snapshot_exposes_required_signals(tmp_path):
    FakeYoutubeDL.script = [info()]
    snapshot = batch.run(make(tmp_path)).snapshot()
    assert set(snapshot) == {"health", "pressure", "efficiency", "items"}
    assert snapshot["health"]["items_ok"] == 1
    assert snapshot["efficiency"]["bytes_downloaded"] == 1024
    assert snapshot["pressure"]["throughput_bps"] >= 0


def test_url_file_ignores_comments_and_blanks(tmp_path):
    listing = tmp_path / "urls.txt"
    listing.write_text("# batch\n\nhttps://e.com/a\n  https://e.com/b  \n\n")
    assert batch.read_url_file(listing) == ["https://e.com/a", "https://e.com/b"]
