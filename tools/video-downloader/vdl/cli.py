"""Command-line surface. Parses arguments into a DownloadConfig and runs it."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import batch, downloader, ffmpeg
from .config import AUDIO_CODECS, QUALITIES, VIDEO_CONTAINERS, DownloadConfig
from .errors import ConfigError, VdlError
from .progress import human_bytes, human_seconds

_EPILOG = """\
examples:
  vdl URL                              download at best quality
  vdl URL -q 1080 -c mp4               cap at 1080p, mp4 container
  vdl URL --audio-only                 extract audio as mp3
  vdl URL --subs en --embed-subs       fetch and burn in English subtitles
  vdl -f urls.txt -j 5                 batch a file of URLs, 5 at a time
  vdl URL --playlist --items 1-10      first ten entries of a playlist
  vdl URL --section 00:01:30-00:04:00  clip a time range
  vdl URL --info                       print available formats, download nothing

Downloads what the site serves to a normal client. It does not break DRM or
paywalls. Only download material you own or are licensed to keep.
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="vdl",
        description="Download video or audio from any site yt-dlp supports.",
        epilog=_EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("urls", nargs="*", help="one or more video URLs")
    parser.add_argument("-f", "--url-file", type=Path, help="file with one URL per line")
    parser.add_argument("-o", "--output", type=Path, default=Path("downloads"),
                        help="output directory (default: ./downloads)")

    quality = parser.add_argument_group("quality")
    quality.add_argument("-q", "--quality", choices=QUALITIES, default="best",
                         help="max vertical resolution (default: best)")
    quality.add_argument("-c", "--container", choices=VIDEO_CONTAINERS, default="auto",
                         help="output container; auto avoids re-encoding (default: auto)")
    quality.add_argument("-a", "--audio-only", action="store_true",
                         help="extract audio only")
    quality.add_argument("--audio-codec", choices=AUDIO_CODECS, default="mp3",
                         help="codec for --audio-only (default: mp3)")

    extras = parser.add_argument_group("extras")
    extras.add_argument("--subs", nargs="+", metavar="LANG", default=[],
                        help="subtitle languages, e.g. en es")
    extras.add_argument("--embed-subs", action="store_true", help="mux subtitles into the file")
    extras.add_argument("--thumbnail", action="store_true", help="embed cover art")
    extras.add_argument("--no-metadata", action="store_true", help="skip metadata tagging")
    extras.add_argument("--section", metavar="START-END",
                        help="clip a time range, e.g. 00:01:30-00:04:00")

    playlist = parser.add_argument_group("playlists")
    playlist.add_argument("-p", "--playlist", action="store_true",
                          help="download the whole playlist, not just the linked video")
    playlist.add_argument("--items", metavar="SPEC",
                          help="playlist entries to take, e.g. 1-10 or 2,4,7")
    playlist.add_argument("--archive", type=Path, metavar="FILE",
                          help="record downloaded IDs here and skip them next run")

    network = parser.add_argument_group("network")
    network.add_argument("-j", "--concurrency", type=int, default=3,
                         help="parallel downloads (default: 3)")
    network.add_argument("--fragments", type=int, default=4,
                         help="parallel fragments per download (default: 4)")
    network.add_argument("-r", "--rate-limit", metavar="RATE",
                         help="throttle, e.g. 4M or 800K")
    network.add_argument("--retries", type=int, default=3,
                         help="retries per URL on network failure (default: 3)")
    network.add_argument("--cookies", type=Path, metavar="FILE",
                         help="Netscape cookie file, for sites you are logged into")
    network.add_argument("--cookies-from-browser", metavar="BROWSER",
                         help="pull cookies from an installed browser, e.g. firefox")

    behaviour = parser.add_argument_group("behaviour")
    behaviour.add_argument("--name", dest="template",
                           default="%(title).200B [%(id)s].%(ext)s",
                           help="output filename template")
    behaviour.add_argument("--overwrite", action="store_true", help="re-download existing files")
    behaviour.add_argument("--no-resume", action="store_true", help="do not resume partial files")
    behaviour.add_argument("--info", action="store_true",
                           help="list available formats and exit")
    behaviour.add_argument("--simulate", action="store_true",
                           help="run every step except writing the file")
    behaviour.add_argument("--json-logs", action="store_true",
                           help="emit structured telemetry to stderr")
    behaviour.add_argument("--quiet", action="store_true", help="suppress progress output")
    behaviour.add_argument("--ffmpeg", metavar="PATH", help="explicit ffmpeg location")
    return parser


def to_config(args: argparse.Namespace) -> DownloadConfig:
    urls = list(args.urls)
    if args.url_file:
        if not args.url_file.exists():
            raise ConfigError(f"URL file not found: {args.url_file}")
        urls.extend(batch.read_url_file(args.url_file))

    # Deduplicate while preserving the order the user gave.
    seen: set[str] = set()
    urls = [u for u in urls if not (u in seen or seen.add(u))]

    return DownloadConfig(
        urls=tuple(urls),
        output_dir=args.output,
        quality=args.quality,
        container=args.container,
        audio_only=args.audio_only,
        audio_codec=args.audio_codec,
        subtitles=tuple(args.subs),
        embed_subtitles=args.embed_subs,
        embed_thumbnail=args.thumbnail,
        embed_metadata=not args.no_metadata,
        playlist=args.playlist or bool(args.items),
        playlist_items=args.items,
        concurrency=args.concurrency,
        fragment_concurrency=args.fragments,
        rate_limit=args.rate_limit,
        retries=args.retries,
        cookies_from_browser=args.cookies_from_browser,
        cookie_file=args.cookies,
        archive_file=args.archive,
        filename_template=args.template,
        sections=args.section,
        resume=not args.no_resume,
        overwrite=args.overwrite,
        simulate=args.simulate,
        quiet=args.quiet,
        json_logs=args.json_logs,
        ffmpeg_location=args.ffmpeg,
    )


def print_info(config: DownloadConfig) -> int:
    """Show what the site offers for the first URL, then stop."""
    info = downloader.probe(config.urls[0], config)
    print(f"\n{info.get('title', 'untitled')}")
    print(f"  uploader : {info.get('uploader', '-')}")
    print(f"  duration : {human_seconds(info.get('duration'))}")
    print(f"  site     : {info.get('extractor_key', '-')}\n")
    print(f"  {'ID':<16}{'EXT':<6}{'RESOLUTION':<13}{'CODEC':<18}{'SIZE':>10}")
    for fmt in info.get("formats", []):
        size = fmt.get("filesize") or fmt.get("filesize_approx")
        codec = f"{fmt.get('vcodec', '-')}/{fmt.get('acodec', '-')}"
        print(
            f"  {str(fmt.get('format_id')):<16}{str(fmt.get('ext')):<6}"
            f"{str(fmt.get('resolution', '-')):<13}{codec[:17]:<18}{human_bytes(size):>10}"
        )
    return 0


def summarize(metrics, config: DownloadConfig) -> None:
    snap = metrics.snapshot()
    health, pressure = snap["health"], snap["pressure"]
    print(
        f"\n{health['items_ok']} ok · {health['items_failed']} failed · "
        f"{human_bytes(snap['efficiency']['bytes_downloaded'])} in "
        f"{human_seconds(pressure['elapsed_s'])} "
        f"({human_bytes(pressure['throughput_bps'])}/s)"
    )
    for item in metrics.items:
        if item.status == "ok":
            print(f"  → {item.filepath or item.title}")
        else:
            print(f"  ✗ {item.url}\n    {item.error_class}: {item.error}", file=sys.stderr)
    if health["items_ok"]:
        print(f"\nSaved to {config.output_dir.resolve()}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    try:
        config = to_config(args)
    except ConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.exit_code

    if not config.quiet and ffmpeg.requires_ffmpeg(
        audio_only=config.audio_only,
        container=config.container,
        embedding=config.embed_subtitles or config.embed_thumbnail or config.embed_metadata,
    ) and not (config.ffmpeg_location or ffmpeg.locate()):
        print(
            "warning: ffmpeg not found — merging, conversion and tagging will be skipped.\n"
            "         install it, or run: pip install imageio-ffmpeg",
            file=sys.stderr,
        )

    try:
        if args.info:
            return print_info(config)
        metrics = batch.run(config)
    except VdlError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return exc.exit_code
    except KeyboardInterrupt:
        print("\ninterrupted — partial files are kept and will resume next run", file=sys.stderr)
        return 130

    if not config.quiet:
        summarize(metrics, config)
    return 0 if metrics.failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
