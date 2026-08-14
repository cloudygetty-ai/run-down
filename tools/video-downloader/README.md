# vdl — video downloader

A hardened command-line downloader for video and audio, built on
[yt-dlp](https://github.com/yt-dlp/yt-dlp) (1800+ supported sites).

yt-dlp does the extraction. `vdl` adds the parts you actually need on top of it:
classified errors with correct retry policy, bounded concurrency for batches,
partial-failure isolation, structured telemetry, and a CLI you can remember.

---

## Install

```bash
cd tools/video-downloader
pip install -r requirements.txt      # yt-dlp + a bundled ffmpeg binary
python -m vdl --help
```

Optionally install it as a real command:

```bash
pip install -e .
vdl --help
```

`ffmpeg` is needed for merging split streams, converting containers, extracting
audio, and tagging. `vdl` uses a system `ffmpeg` if one is on `PATH`; otherwise
it falls back to the binary shipped by `imageio-ffmpeg`, so the default install
works with no system packages. If neither is present it warns up front instead
of failing halfway through.

---

## Usage

```bash
vdl URL                                  # best available quality
vdl URL -q 1080 -c mp4                   # cap at 1080p, force mp4
vdl URL --audio-only                     # extract audio as mp3
vdl URL --audio-only --audio-codec flac  # lossless audio
vdl URL --subs en --embed-subs           # fetch + mux English subtitles
vdl URL --thumbnail                      # embed cover art
vdl URL --section 00:01:30-00:04:00      # clip a time range
vdl URL --info                           # list formats, download nothing
```

### Batches and playlists

```bash
vdl -f urls.txt -j 5                     # 5 at a time from a URL list
vdl URL --playlist                       # whole playlist, not just the video
vdl URL --playlist --items 1-10          # first ten entries
vdl -f urls.txt --archive done.txt       # skip anything already downloaded
```

`urls.txt` is one URL per line; blank lines and `#` comments are ignored.

### Network

```bash
vdl URL -r 4M                            # throttle to 4 MB/s
vdl URL --retries 5                      # more attempts on transport failure
vdl URL --cookies-from-browser firefox   # use your browser session
vdl URL --cookies cookies.txt            # or a Netscape cookie file
```

---

## Options

| Flag | Meaning |
|---|---|
| `-o, --output DIR` | output directory (default `./downloads`) |
| `-q, --quality` | `best`, `2160`, `1440`, `1080`, `720`, `480`, `360`, `worst` |
| `-c, --container` | `auto`, `mp4`, `mkv`, `webm` — `auto` avoids re-encoding |
| `-a, --audio-only` | extract audio only |
| `--audio-codec` | `mp3`, `m4a`, `opus`, `wav`, `flac` |
| `--subs LANG...` | download subtitle languages |
| `--embed-subs` | mux subtitles into the file |
| `--thumbnail` | embed cover art |
| `--no-metadata` | skip metadata tagging |
| `--section START-END` | clip a time range |
| `-p, --playlist` | expand playlists |
| `--items SPEC` | playlist entries, e.g. `1-10` or `2,4,7` |
| `--archive FILE` | remember completed IDs and skip them |
| `-j, --concurrency N` | parallel downloads (default 3) |
| `--fragments N` | parallel fragments per download (default 4) |
| `-r, --rate-limit` | throttle, e.g. `4M`, `800K` |
| `--retries N` | retries per URL on transport failure (default 3) |
| `--cookies FILE` / `--cookies-from-browser` | authenticated sessions |
| `--name TEMPLATE` | filename template (yt-dlp syntax) |
| `--overwrite` / `--no-resume` | re-download policy |
| `--info` | list available formats and exit |
| `--simulate` | full run without writing files |
| `--json-logs` | structured telemetry to stderr |
| `--quiet` | suppress progress |

---

## Design notes

**Errors are classified, and classification drives retries.** yt-dlp reports a
dead 404 and a timed-out socket with the same `Unable to download webpage`
prefix. Retrying the first is pure waste. `vdl` parses the HTTP status out of
the message and only retries what can actually succeed — transport failures,
429s, and 5xx — with exponential backoff. DRM walls, private videos, and 404s
fail immediately with a message naming the real cause.

| Exit code | Meaning |
|---|---|
| `0` | all downloads succeeded |
| `1` | at least one item failed |
| `2` | invalid configuration |
| `3` | unsupported URL |
| `4` | protected content (DRM, private, login required) |
| `5` | network failure after all retries |
| `6` | ffmpeg merge/postprocessing failure |
| `7` | content not found (permanent 4xx) |

**One failure never kills a batch.** Each URL is independent; the run reports
partial success and exits `1`. Interrupting with Ctrl-C keeps partial files,
which the next run resumes.

**Every run explains itself.** `--json-logs` emits one JSON object per event to
stderr — separate from the progress UI on stdout, so `vdl ... 2> run.jsonl`
gives a clean machine-readable log covering health (items ok/failed/skipped),
pressure (elapsed, throughput, items/min), and efficiency (bytes, retry
overhead, average item time).

**Format selection degrades progressively.** The `-f` expression falls back from
capped split streams → capped progressive → anything available, so a site
offering a single muxed stream still succeeds instead of erroring on an
unsatisfiable constraint.

---

## Layout

```
tools/video-downloader/
├── vdl/
│   ├── cli.py           argument parsing, output formatting, exit codes
│   ├── config.py        DownloadConfig — validated once, frozen
│   ├── formats.py       yt-dlp format selector construction
│   ├── options.py       DownloadConfig → yt-dlp options dict
│   ├── downloader.py    single URL, retry policy, error classification
│   ├── batch.py         concurrent execution, failure isolation
│   ├── progress.py      terminal progress rendering
│   ├── telemetry.py     HEALTH / PRESSURE / EFFICIENCY signals
│   ├── ffmpeg.py        ffmpeg discovery with bundled fallback
│   └── errors.py        error taxonomy, retry classification, exit codes
└── tests/               79 tests, no network access required
```

Run the suite with `python -m pytest` from `tools/video-downloader`. The tests
replace `yt_dlp.YoutubeDL` with a scripted stub, so retry policy, classification
and concurrency are verified offline.

---

## Scope

`vdl` downloads what a site serves to an ordinary client. It does not break DRM,
defeat paywalls, or bypass authentication — for login-gated content it reuses
cookies *you* already hold via `--cookies-from-browser`.

Download only what you own, what is offered for download, or what its licence
permits. Site terms of service and copyright still apply.
