"""Immutable download configuration — the single contract between CLI and engine.

Validation happens once, here. Everything downstream may assume a valid config.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .errors import ConfigError

#: Container the caller wants on disk. `auto` keeps whatever the site serves,
#: which avoids a re-encode and is therefore the default.
VIDEO_CONTAINERS = ("auto", "mp4", "mkv", "webm")
AUDIO_CODECS = ("mp3", "m4a", "opus", "wav", "flac")

#: Vertical resolution cap. `best` means no cap.
QUALITIES = ("best", "2160", "1440", "1080", "720", "480", "360", "worst")


@dataclass(frozen=True)
class DownloadConfig:
    """Everything one download run needs. Frozen so no stage can mutate it."""

    urls: tuple[str, ...]
    output_dir: Path = Path("downloads")
    quality: str = "best"
    container: str = "auto"
    audio_only: bool = False
    audio_codec: str = "mp3"
    subtitles: tuple[str, ...] = ()
    embed_subtitles: bool = False
    embed_thumbnail: bool = False
    embed_metadata: bool = True
    playlist: bool = False
    playlist_items: str | None = None
    concurrency: int = 3
    fragment_concurrency: int = 4
    rate_limit: str | None = None
    retries: int = 3
    cookies_from_browser: str | None = None
    cookie_file: Path | None = None
    archive_file: Path | None = None
    filename_template: str = "%(title).200B [%(id)s].%(ext)s"
    sections: str | None = None
    resume: bool = True
    overwrite: bool = False
    simulate: bool = False
    quiet: bool = False
    json_logs: bool = False
    ffmpeg_location: str | None = None
    extra_ytdlp_args: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.urls:
            raise ConfigError("no URLs supplied")
        if self.quality not in QUALITIES:
            raise ConfigError(
                f"quality {self.quality!r} invalid; choose from {', '.join(QUALITIES)}"
            )
        if self.container not in VIDEO_CONTAINERS:
            raise ConfigError(
                f"container {self.container!r} invalid; choose from {', '.join(VIDEO_CONTAINERS)}"
            )
        if self.audio_codec not in AUDIO_CODECS:
            raise ConfigError(
                f"audio codec {self.audio_codec!r} invalid; choose from {', '.join(AUDIO_CODECS)}"
            )
        if self.concurrency < 1:
            raise ConfigError("concurrency must be >= 1")
        if self.fragment_concurrency < 1:
            raise ConfigError("fragment concurrency must be >= 1")
        if self.retries < 0:
            raise ConfigError("retries must be >= 0")
        if self.audio_only and self.container != "auto":
            raise ConfigError("--container conflicts with --audio-only; use --audio-codec")
        if self.embed_subtitles and not self.subtitles:
            raise ConfigError("--embed-subs requires --subs LANG")
        if self.overwrite and self.resume is False:
            return  # explicit clean re-download; nothing to reconcile
        if self.cookie_file and self.cookies_from_browser:
            raise ConfigError("use either --cookies FILE or --cookies-from-browser, not both")
