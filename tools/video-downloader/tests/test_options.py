from pathlib import Path

import pytest

from vdl import options
from vdl.config import DownloadConfig


def make(**kwargs) -> DownloadConfig:
    return DownloadConfig(urls=("https://example.com/v",), **kwargs)


def keys(opts, key):
    return [p["key"] for p in opts["postprocessors"]] if key == "pp" else opts[key]


def test_output_template_lands_under_output_dir():
    opts = options.build(make(output_dir=Path("/tmp/clips")))
    assert opts["outtmpl"]["default"].startswith("/tmp/clips/")
    assert opts["paths"]["home"] == "/tmp/clips"


def test_single_video_does_not_expand_playlist_by_default():
    assert options.build(make())["noplaylist"] is True
    assert options.build(make(playlist=True))["noplaylist"] is False


def test_audio_only_adds_extract_audio_postprocessor():
    opts = options.build(make(audio_only=True, audio_codec="opus"))
    extract = next(p for p in opts["postprocessors"] if p["key"] == "FFmpegExtractAudio")
    assert extract["preferredcodec"] == "opus"


def test_metadata_postprocessor_is_on_by_default_and_removable():
    assert "FFmpegMetadata" in keys(options.build(make()), "pp")
    assert "FFmpegMetadata" not in keys(options.build(make(embed_metadata=False)), "pp")


def test_subtitles_request_both_manual_and_auto_tracks():
    opts = options.build(make(subtitles=("en", "es")))
    assert opts["writesubtitles"] is True
    assert opts["writeautomaticsub"] is True
    assert opts["subtitleslangs"] == ["en", "es"]


def test_merge_format_omitted_when_container_auto():
    assert "merge_output_format" not in options.build(make())
    assert options.build(make(container="mkv"))["merge_output_format"] == "mkv"


@pytest.mark.parametrize(
    "text, expected",
    [("1024", 1024), ("800K", 819200), ("4M", 4194304), ("1.5M", 1572864), ("2MB", 2097152)],
)
def test_rate_limit_parsing(text, expected):
    assert options._parse_rate(text) == expected


def test_errors_are_not_swallowed_by_ytdlp():
    # The batch layer owns retry and failure policy; yt-dlp must surface errors.
    assert options.build(make())["ignoreerrors"] is False


def test_cookie_file_and_browser_map_to_distinct_options():
    assert options.build(make(cookie_file=Path("c.txt")))["cookiefile"] == "c.txt"
    assert options.build(make(cookies_from_browser="firefox"))["cookiesfrombrowser"] == ("firefox",)


def test_archive_enables_skip_on_rerun():
    opts = options.build(make(archive_file=Path("done.txt")))
    assert opts["download_archive"] == "done.txt"


def test_section_produces_keyframe_accurate_range():
    opts = options.build(make(sections="00:01:30-00:02:00"))
    assert opts["force_keyframes_at_cuts"] is True
    ranges = opts["download_ranges"]({"duration": 600}, None)
    assert ranges == [{"start_time": 90, "end_time": 120}]


def test_open_ended_section_runs_to_end_of_video():
    opts = options.build(make(sections="30-"))
    assert opts["download_ranges"]({"duration": 600}, None) == [
        {"start_time": 30, "end_time": 600}
    ]


def test_extra_args_override_generated_options():
    opts = options.build(make(extra_ytdlp_args={"format": "worst", "custom": 1}))
    assert opts["format"] == "worst"
    assert opts["custom"] == 1
