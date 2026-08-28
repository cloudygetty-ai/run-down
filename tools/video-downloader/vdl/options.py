"""Translate a DownloadConfig into a yt-dlp options dict.

This is the only place that knows yt-dlp's option vocabulary. Keeping the
mapping in one pure function makes it testable without touching the network.
"""

from __future__ import annotations

from typing import Any, Callable

from . import ffmpeg, formats
from .config import DownloadConfig


def _postprocessors(config: DownloadConfig) -> list[dict[str, Any]]:
    chain: list[dict[str, Any]] = []

    if config.audio_only:
        chain.append(
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": config.audio_codec,
                "preferredquality": "0",  # 0 = best VBR for lossy codecs
            }
        )

    if config.embed_subtitles:
        chain.append({"key": "FFmpegEmbedSubtitle", "already_have_subtitle": False})

    if config.embed_metadata:
        chain.append({"key": "FFmpegMetadata", "add_metadata": True})

    if config.embed_thumbnail:
        chain.append({"key": "EmbedThumbnail", "already_have_thumbnail": False})

    return chain


def build(
    config: DownloadConfig,
    *,
    progress_hooks: list[Callable[[dict], None]] | None = None,
    logger: Any | None = None,
) -> dict[str, Any]:
    """Produce the options dict handed to `yt_dlp.YoutubeDL`."""
    opts: dict[str, Any] = {
        "format": formats.selector(config),
        "outtmpl": {"default": str(config.output_dir / config.filename_template)},
        "paths": {"home": str(config.output_dir)},
        "noplaylist": not config.playlist,
        "continuedl": config.resume,
        "overwrites": config.overwrite,
        "retries": config.retries,
        "fragment_retries": config.retries,
        "concurrent_fragment_downloads": config.fragment_concurrency,
        "ignoreerrors": False,  # batch layer owns error policy, not yt-dlp
        "quiet": True,  # our own reporter renders progress
        "no_warnings": config.quiet,
        "noprogress": True,
        "simulate": config.simulate,
        "writethumbnail": config.embed_thumbnail,
        "addmetadata": config.embed_metadata,
        "postprocessors": _postprocessors(config),
        "progress_hooks": progress_hooks or [],
        "trim_file_name": 200,  # keep paths under filesystem limits
    }

    merge_to = formats.merge_container(config)
    if merge_to:
        opts["merge_output_format"] = merge_to

    if config.subtitles:
        opts["writesubtitles"] = True
        opts["writeautomaticsub"] = True
        opts["subtitleslangs"] = list(config.subtitles)

    if config.playlist_items:
        opts["playlist_items"] = config.playlist_items

    if config.rate_limit:
        opts["ratelimit"] = _parse_rate(config.rate_limit)

    if config.sections:
        # download_ranges wants a callable; yt-dlp ships the parser for it.
        from yt_dlp.utils import parse_duration

        opts["download_ranges"] = _section_ranges(config.sections, parse_duration)
        opts["force_keyframes_at_cuts"] = True

    if config.cookie_file:
        opts["cookiefile"] = str(config.cookie_file)
    if config.cookies_from_browser:
        opts["cookiesfrombrowser"] = (config.cookies_from_browser,)

    if config.archive_file:
        opts["download_archive"] = str(config.archive_file)

    location = config.ffmpeg_location or ffmpeg.locate()
    if location:
        opts["ffmpeg_location"] = location

    if logger is not None:
        opts["logger"] = logger

    opts.update(config.extra_ytdlp_args)
    return opts


def _parse_rate(value: str) -> int:
    """Convert `4.5M` / `800K` / `1200` into bytes per second."""
    units = {"k": 1024, "m": 1024**2, "g": 1024**3}
    text = value.strip().lower().rstrip("b")
    if text and text[-1] in units:
        return int(float(text[:-1]) * units[text[-1]])
    return int(float(text))


def _section_ranges(spec: str, parse_duration) -> Callable[[Any, Any], list[dict]]:
    """Build a download_ranges callable from `START-END` timestamps.

    Accepts `00:01:30-00:02:45` or bare seconds `90-165`. An open end (`90-`)
    runs to the end of the video.
    """
    start_text, _, end_text = spec.partition("-")
    start = parse_duration(start_text) or 0
    end = parse_duration(end_text) if end_text else None

    def ranges(info_dict, ydl):  # noqa: ARG001 - yt-dlp calls with both
        stop = end if end is not None else info_dict.get("duration") or 0
        return [{"start_time": start, "end_time": stop}]

    return ranges
