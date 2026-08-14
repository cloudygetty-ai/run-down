"""Error taxonomy. Every failure the CLI can surface maps to exactly one class.

Exit codes are stable — scripts wrapping `vdl` branch on them.
"""

from __future__ import annotations

import re


class VdlError(Exception):
    """Base for every error this tool raises deliberately."""

    exit_code = 1


class ConfigError(VdlError):
    """Caller supplied contradictory or invalid options."""

    exit_code = 2


class UnsupportedUrlError(VdlError):
    """No extractor claims this URL."""

    exit_code = 3


class ProtectedContentError(VdlError):
    """Content is DRM-encrypted or behind an account the tool cannot enter.

    Not recoverable by retry. yt-dlp does not decrypt DRM and neither do we —
    this exists so the CLI reports the real reason instead of a generic failure.
    """

    exit_code = 4


class NetworkError(VdlError):
    """Transient transport failure. Retryable."""

    exit_code = 5


class MergeError(VdlError):
    """Streams downloaded but ffmpeg could not combine them."""

    exit_code = 6


class NotFoundError(VdlError):
    """The URL resolved but the content is gone. Retrying cannot help."""

    exit_code = 7


#: Substrings yt-dlp puts in DownloadError messages for unrecoverable access
#: problems. Matched case-insensitively to classify before retrying.
_PROTECTED_MARKERS = (
    "drm",
    "this video is private",
    "members-only",
    "sign in to confirm",
    "requires authentication",
    "purchase",
    "subscribe to this channel",
    "video unavailable",
    "geo restricted",
    "not available in your country",
)

_NETWORK_MARKERS = (
    "timed out",
    "connection reset",
    "temporary failure",
    "unable to download webpage",
    "read operation timed out",
    "connection aborted",
    "remote end closed",
)

#: HTTP statuses that will never succeed on retry. Kept ahead of the generic
#: network markers because yt-dlp reports a 404 as "Unable to download webpage",
#: which would otherwise burn the full retry budget on content that is gone.
_AUTH_HTTP = re.compile(r"http error (401|403)\b", re.IGNORECASE)
_GONE_HTTP = re.compile(r"http error (400|404|405|410|451)\b", re.IGNORECASE)
#: Rate limits and server faults are worth another attempt.
_TRANSIENT_HTTP = re.compile(r"http error (408|429|5\d\d)\b", re.IGNORECASE)


def classify(message: str) -> type[VdlError]:
    """Map a raw yt-dlp error message to the narrowest error class.

    Order matters — it decides retry behaviour. Unrecoverable cases are matched
    first so a DRM wall or a dead URL never consumes the retry budget.
    """
    lowered = message.lower()
    if any(marker in lowered for marker in _PROTECTED_MARKERS):
        return ProtectedContentError
    if _AUTH_HTTP.search(lowered):
        return ProtectedContentError
    if _GONE_HTTP.search(lowered):
        return NotFoundError
    if "unsupported url" in lowered or "no suitable extractor" in lowered:
        return UnsupportedUrlError
    if _TRANSIENT_HTTP.search(lowered):
        return NetworkError
    if any(marker in lowered for marker in _NETWORK_MARKERS):
        return NetworkError
    if "ffmpeg" in lowered or "postprocessing" in lowered:
        return MergeError
    return VdlError


def is_retryable(error: BaseException) -> bool:
    """Only transport failures earn another attempt."""
    return isinstance(error, NetworkError)
