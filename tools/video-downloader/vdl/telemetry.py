"""Structured run telemetry: HEALTH, PRESSURE, EFFICIENCY.

A download run that cannot explain what it did is not finished. Every stage
emits one structured record; `--json-logs` streams them to stderr for machine
consumption while the human reporter writes to stdout.
"""

from __future__ import annotations

import json
import sys
import threading
import time
from dataclasses import asdict, dataclass, field


@dataclass
class ItemResult:
    """Outcome of one URL."""

    url: str
    status: str  # ok | failed | skipped
    title: str | None = None
    filepath: str | None = None
    bytes_downloaded: int = 0
    duration_s: float = 0.0
    error: str | None = None
    error_class: str | None = None
    attempts: int = 1


@dataclass
class RunMetrics:
    """Aggregate view of a whole run. Safe to mutate from worker threads."""

    started_at: float = field(default_factory=time.time)
    items: list[ItemResult] = field(default_factory=list)
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def record(self, result: ItemResult) -> None:
        with self._lock:
            self.items.append(result)

    @property
    def elapsed_s(self) -> float:
        return time.time() - self.started_at

    @property
    def succeeded(self) -> int:
        return sum(1 for i in self.items if i.status == "ok")

    @property
    def failed(self) -> int:
        return sum(1 for i in self.items if i.status == "failed")

    @property
    def skipped(self) -> int:
        return sum(1 for i in self.items if i.status == "skipped")

    @property
    def total_bytes(self) -> int:
        return sum(i.bytes_downloaded for i in self.items)

    def snapshot(self) -> dict:
        """The three required signals, plus the per-item audit trail."""
        elapsed = max(self.elapsed_s, 1e-6)
        return {
            "health": {
                "alive": True,
                "items_total": len(self.items),
                "items_ok": self.succeeded,
                "items_failed": self.failed,
                "items_skipped": self.skipped,
            },
            "pressure": {
                "elapsed_s": round(elapsed, 2),
                "throughput_bps": int(self.total_bytes / elapsed),
                "items_per_min": round(len(self.items) / elapsed * 60, 2),
            },
            "efficiency": {
                "bytes_downloaded": self.total_bytes,
                "retry_overhead": sum(max(i.attempts - 1, 0) for i in self.items),
                "avg_item_s": round(
                    sum(i.duration_s for i in self.items) / max(len(self.items), 1), 2
                ),
            },
            "items": [
                {k: v for k, v in asdict(i).items() if not k.startswith("_")}
                for i in self.items
            ],
        }


def emit(event: str, payload: dict, *, enabled: bool) -> None:
    """Write one structured JSON line to stderr.

    stderr keeps machine output separate from the progress UI on stdout, so
    `vdl ... 2> run.jsonl` yields a clean, parseable log.
    """
    if not enabled:
        return
    record = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "service": "vdl",
        "event": event,
        "data": payload,
    }
    print(json.dumps(record, default=str), file=sys.stderr, flush=True)
