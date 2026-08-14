"""Concurrent multi-URL execution.

Downloads are network-bound, so a thread pool is the right shape: yt-dlp
releases the GIL during socket and disk work. One failed URL never stops the
others — the run reports partial success and exits non-zero.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from . import downloader
from .config import DownloadConfig
from .telemetry import ItemResult, RunMetrics, emit


def read_url_file(path: Path) -> list[str]:
    """One URL per line; `#` comments and blanks ignored."""
    lines = path.read_text(encoding="utf-8").splitlines()
    return [
        stripped
        for line in lines
        if (stripped := line.strip()) and not stripped.startswith("#")
    ]


def run(config: DownloadConfig) -> RunMetrics:
    """Execute every URL in the config, honouring the concurrency limit."""
    metrics = RunMetrics()
    config.output_dir.mkdir(parents=True, exist_ok=True)

    emit(
        "run.start",
        {"urls": len(config.urls), "concurrency": config.concurrency,
         "output_dir": str(config.output_dir)},
        enabled=config.json_logs,
    )

    # A single URL needs no pool — keeps stack traces and Ctrl-C behaviour simple.
    if len(config.urls) == 1 or config.concurrency == 1:
        for url in config.urls:
            _record(metrics, downloader.download(url, config), config)
        return _finish(metrics, config)

    workers = min(config.concurrency, len(config.urls))
    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="vdl") as pool:
        futures = {pool.submit(downloader.download, url, config): url for url in config.urls}
        for future in as_completed(futures):
            url = futures[future]
            try:
                _record(metrics, future.result(), config)
            except BaseException as exc:  # worker crashed outside the error contract
                _record(
                    metrics,
                    ItemResult(url=url, status="failed", error=str(exc),
                               error_class=type(exc).__name__),
                    config,
                )
    return _finish(metrics, config)


def _record(metrics: RunMetrics, result: ItemResult, config: DownloadConfig) -> None:
    metrics.record(result)
    emit(
        f"item.{result.status}",
        {"url": result.url, "title": result.title, "path": result.filepath,
         "bytes": result.bytes_downloaded, "duration_s": result.duration_s,
         "attempts": result.attempts, "error": result.error},
        enabled=config.json_logs,
    )


def _finish(metrics: RunMetrics, config: DownloadConfig) -> RunMetrics:
    emit("run.finish", metrics.snapshot(), enabled=config.json_logs)
    return metrics
