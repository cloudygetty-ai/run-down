"""Terminal progress reporting.

yt-dlp calls the hook from the downloader thread, so all state here is
per-hook-instance and writes are serialised through one shared lock.
"""

from __future__ import annotations

import sys
import threading
import time

_WRITE_LOCK = threading.Lock()


def human_bytes(value: float | None) -> str:
    if not value:
        return "?"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if value < 1024:
            return f"{value:.1f}{unit}"
        value /= 1024
    return f"{value:.1f}PB"


def human_seconds(value: float | None) -> str:
    if value is None:
        return "--:--"
    minutes, seconds = divmod(int(value), 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


class ProgressReporter:
    """Renders one line per active download, throttled to 10 updates/second."""

    def __init__(self, *, quiet: bool = False, label: str = "") -> None:
        self.quiet = quiet
        self.label = label
        self.bytes_downloaded = 0
        self._last_render = 0.0

    def hook(self, status: dict) -> None:
        state = status.get("status")
        if state == "downloading":
            self._on_progress(status)
        elif state == "finished":
            self._on_finished(status)

    def _on_progress(self, status: dict) -> None:
        self.bytes_downloaded = status.get("downloaded_bytes") or self.bytes_downloaded
        if self.quiet:
            return
        now = time.monotonic()
        if now - self._last_render < 0.1:
            return
        self._last_render = now

        total = status.get("total_bytes") or status.get("total_bytes_estimate")
        done = status.get("downloaded_bytes") or 0
        pct = f"{done / total * 100:5.1f}%" if total else "  ??.?%"
        speed = status.get("speed")
        line = (
            f"  {self._name(status):<44.44} {pct} "
            f"{human_bytes(done):>9}/{human_bytes(total):<9} "
            f"{human_bytes(speed):>9}/s ETA {human_seconds(status.get('eta'))}"
        )
        self._write(f"\r{line}", newline=False)

    def _on_finished(self, status: dict) -> None:
        self.bytes_downloaded = status.get("downloaded_bytes") or self.bytes_downloaded
        if self.quiet:
            return
        self._write(f"\r  {self._name(status):<44.44} {'done':>7} {' ' * 42}", newline=True)

    def _name(self, status: dict) -> str:
        info = status.get("info_dict") or {}
        return self.label or info.get("title") or status.get("filename", "stream")

    @staticmethod
    def _write(text: str, *, newline: bool) -> None:
        with _WRITE_LOCK:
            sys.stdout.write(text + ("\n" if newline else ""))
            sys.stdout.flush()


class SilentLogger:
    """Absorbs yt-dlp's own logging so it never collides with our progress line.

    Errors are captured rather than printed — the downloader re-raises them
    with classification, which is the message the user actually needs.
    """

    def __init__(self) -> None:
        self.errors: list[str] = []

    def debug(self, msg: str) -> None:  # noqa: D102
        pass

    def info(self, msg: str) -> None:  # noqa: D102
        pass

    def warning(self, msg: str) -> None:  # noqa: D102
        pass

    def error(self, msg: str) -> None:  # noqa: D102
        self.errors.append(msg)
