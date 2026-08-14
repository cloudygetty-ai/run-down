from pathlib import Path

import pytest

from vdl.config import DownloadConfig
from vdl.errors import ConfigError


def make(**kwargs) -> DownloadConfig:
    return DownloadConfig(urls=("https://example.com/v",), **kwargs)


def test_defaults_are_valid():
    config = make()
    assert config.quality == "best"
    assert config.container == "auto"
    assert config.resume is True
    assert config.output_dir == Path("downloads")


def test_rejects_empty_url_list():
    with pytest.raises(ConfigError, match="no URLs"):
        DownloadConfig(urls=())


@pytest.mark.parametrize(
    "kwargs, message",
    [
        ({"quality": "8k"}, "quality"),
        ({"container": "avi"}, "container"),
        ({"audio_codec": "aac"}, "audio codec"),
        ({"concurrency": 0}, "concurrency"),
        ({"fragment_concurrency": 0}, "fragment concurrency"),
        ({"retries": -1}, "retries"),
    ],
)
def test_rejects_invalid_values(kwargs, message):
    with pytest.raises(ConfigError, match=message):
        make(**kwargs)


def test_audio_only_conflicts_with_container():
    with pytest.raises(ConfigError, match="audio-only"):
        make(audio_only=True, container="mp4")


def test_embed_subs_requires_languages():
    with pytest.raises(ConfigError, match="requires --subs"):
        make(embed_subtitles=True)


def test_cookie_sources_are_mutually_exclusive():
    with pytest.raises(ConfigError, match="not both"):
        make(cookie_file=Path("c.txt"), cookies_from_browser="firefox")


def test_config_is_immutable():
    config = make()
    with pytest.raises(Exception):
        config.quality = "720"  # type: ignore[misc]
