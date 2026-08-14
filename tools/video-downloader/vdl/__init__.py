"""vdl — a thin, hardened CLI over yt-dlp.

Public surface is deliberately small: build a DownloadConfig, hand it to
`batch.run`, read the RunMetrics.
"""

from .config import DownloadConfig
from .errors import VdlError
from .telemetry import ItemResult, RunMetrics

__version__ = "1.0.0"
__all__ = ["DownloadConfig", "ItemResult", "RunMetrics", "VdlError"]
