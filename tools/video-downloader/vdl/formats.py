"""Format selector construction.

yt-dlp format strings are the single highest-leverage knob in the whole tool —
they decide resolution, codec, and whether a merge is needed. They are built
here and nowhere else, so the rules stay auditable in one place.
"""

from __future__ import annotations

from .config import DownloadConfig

#: Containers that cannot hold arbitrary codecs; picking the matching stream up
#: front avoids a full re-encode during merge.
_CONTAINER_PREFERENCE = {
    "mp4": "[ext=mp4]",
    "webm": "[ext=webm]",
}


def video_selector(config: DownloadConfig) -> str:
    """Build the `-f` expression for a video download.

    Falls back progressively: capped split streams → capped progressive →
    anything. A site that offers only one muxed stream still succeeds.
    """
    height = "" if config.quality in ("best", "worst") else f"[height<={config.quality}]"
    ext = _CONTAINER_PREFERENCE.get(config.container, "")

    if config.quality == "worst":
        return "worstvideo+worstaudio/worst"

    candidates = [
        f"bestvideo{height}{ext}+bestaudio{ext}",
        f"bestvideo{height}+bestaudio",
        f"best{height}{ext}",
        f"best{height}",
        "best",
    ]
    # Dedupe while preserving order: with container=auto the ext-qualified and
    # bare candidates collapse into each other.
    seen: set[str] = set()
    ordered = [c for c in candidates if not (c in seen or seen.add(c))]
    return "/".join(ordered)


def audio_selector() -> str:
    """Audio-only downloads always take the best audio stream available."""
    return "bestaudio/best"


def selector(config: DownloadConfig) -> str:
    return audio_selector() if config.audio_only else video_selector(config)


def merge_container(config: DownloadConfig) -> str | None:
    """Container to merge split streams into, or None to let yt-dlp decide.

    `auto` deliberately returns None: forcing a container is what triggers
    expensive re-encodes when the source codecs do not fit.
    """
    if config.audio_only or config.container == "auto":
        return None
    return config.container
