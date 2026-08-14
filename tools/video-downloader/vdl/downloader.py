"""Single-URL download with classified errors and bounded retries."""

from __future__ import annotations

import time
from typing import Any

from . import errors, options
from .config import DownloadConfig
from .progress import ProgressReporter, SilentLogger
from .telemetry import ItemResult

#: Exponential backoff base, in seconds. Only transport errors reach it.
_BACKOFF_BASE = 2.0


def probe(url: str, config: DownloadConfig) -> dict[str, Any]:
    """Fetch metadata without downloading. Raises a classified VdlError."""
    import yt_dlp

    opts = options.build(config, logger=SilentLogger())
    opts["simulate"] = True
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False) or {}
    except Exception as exc:  # yt-dlp raises many shapes; classify uniformly
        raise errors.classify(str(exc))(str(exc)) from exc


def download(url: str, config: DownloadConfig) -> ItemResult:
    """Download one URL, retrying only transport failures.

    Returns an ItemResult in every case — the batch layer decides whether a
    failure should stop the run, so this function does not raise on a failed
    download, only records it.
    """
    started = time.monotonic()
    attempts = 0
    last_error: BaseException | None = None

    while attempts <= config.retries:
        attempts += 1
        reporter = ProgressReporter(quiet=config.quiet)
        try:
            info = _attempt(url, config, reporter)
            return ItemResult(
                url=url,
                status="ok",
                title=info.get("title"),
                filepath=_resolved_path(info),
                bytes_downloaded=reporter.bytes_downloaded,
                duration_s=round(time.monotonic() - started, 2),
                attempts=attempts,
            )
        except errors.VdlError as exc:
            last_error = exc
            if not errors.is_retryable(exc) or attempts > config.retries:
                break
            time.sleep(_BACKOFF_BASE ** (attempts - 1))

    return ItemResult(
        url=url,
        status="failed",
        duration_s=round(time.monotonic() - started, 2),
        error=str(last_error),
        error_class=type(last_error).__name__,
        attempts=attempts,
    )


def _attempt(url: str, config: DownloadConfig, reporter: ProgressReporter) -> dict[str, Any]:
    import yt_dlp

    logger = SilentLogger()
    opts = options.build(config, progress_hooks=[reporter.hook], logger=logger)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=not config.simulate)
    except Exception as exc:
        message = str(exc) or "; ".join(logger.errors) or "unknown download failure"
        raise errors.classify(message)(message) from exc

    if info is None:
        message = "; ".join(logger.errors) or "extractor returned no result"
        raise errors.classify(message)(message)
    return info


def _resolved_path(info: dict[str, Any]) -> str | None:
    """Final on-disk path, after any postprocessing renamed the file."""
    if requested := info.get("requested_downloads"):
        entry = requested[0]
        return entry.get("filepath") or entry.get("_filename")
    return info.get("filepath") or info.get("_filename")
