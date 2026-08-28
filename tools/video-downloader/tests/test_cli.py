from pathlib import Path

import pytest

from vdl import cli
from vdl.errors import ConfigError


def parse(argv):
    return cli.build_parser().parse_args(argv)


def test_minimal_invocation():
    config = cli.to_config(parse(["https://e.com/a"]))
    assert config.urls == ("https://e.com/a",)
    assert config.output_dir == Path("downloads")


def test_flags_map_onto_config():
    config = cli.to_config(
        parse(["https://e.com/a", "-q", "720", "-c", "mp4", "-o", "/tmp/out",
               "-j", "5", "-r", "2M", "--subs", "en", "--embed-subs", "--thumbnail"])
    )
    assert (config.quality, config.container) == ("720", "mp4")
    assert config.output_dir == Path("/tmp/out")
    assert config.concurrency == 5
    assert config.rate_limit == "2M"
    assert config.subtitles == ("en",)
    assert config.embed_subtitles and config.embed_thumbnail


def test_duplicate_urls_collapse_preserving_order():
    config = cli.to_config(parse(["https://e.com/b", "https://e.com/a", "https://e.com/b"]))
    assert config.urls == ("https://e.com/b", "https://e.com/a")


def test_url_file_entries_are_appended(tmp_path):
    listing = tmp_path / "urls.txt"
    listing.write_text("https://e.com/x\n# note\nhttps://e.com/y\n")
    config = cli.to_config(parse(["https://e.com/a", "-f", str(listing)]))
    assert config.urls == ("https://e.com/a", "https://e.com/x", "https://e.com/y")


def test_missing_url_file_is_a_config_error(tmp_path):
    with pytest.raises(ConfigError, match="not found"):
        cli.to_config(parse(["-f", str(tmp_path / "nope.txt")]))


def test_items_implies_playlist_mode():
    config = cli.to_config(parse(["https://e.com/list", "--items", "1-10"]))
    assert config.playlist is True
    assert config.playlist_items == "1-10"


def test_no_urls_exits_with_config_code(capsys):
    assert cli.main([]) == ConfigError.exit_code
    assert "no URLs" in capsys.readouterr().err


def test_conflicting_flags_exit_with_config_code(capsys):
    assert cli.main(["https://e.com/a", "--audio-only", "-c", "mp4"]) == ConfigError.exit_code
    assert "audio-only" in capsys.readouterr().err


def test_help_lists_every_group():
    text = cli.build_parser().format_help()
    for group in ("quality", "extras", "playlists", "network", "behaviour"):
        assert group in text
