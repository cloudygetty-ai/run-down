"""ffmpeg discovery.

Merging split video+audio streams, remuxing, and audio extraction all require
ffmpeg. Rather than fail late with a postprocessing error, resolve it up front
and degrade with a clear message.
"""

from __future__ import annotations

import shutil
from functools import lru_cache


@lru_cache(maxsize=1)
def locate() -> str | None:
    """Return a usable ffmpeg path, or None.

    Order: PATH first (a system ffmpeg is what the user expects to be used),
    then the pip-installed `imageio-ffmpeg` binary as a zero-config fallback so
    the tool works on machines where installing ffmpeg system-wide is awkward.
    """
    system = shutil.which("ffmpeg")
    if system:
        return system

    try:
        import imageio_ffmpeg
    except ImportError:
        return None

    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # binary missing for this platform
        return None


def requires_ffmpeg(*, audio_only: bool, container: str, embedding: bool) -> bool:
    """Whether the requested operation will invoke a postprocessor."""
    return audio_only or container != "auto" or embedding
