from vdl import formats
from vdl.config import DownloadConfig


def make(**kwargs) -> DownloadConfig:
    return DownloadConfig(urls=("https://example.com/v",), **kwargs)


def test_best_quality_has_no_height_cap():
    selector = formats.video_selector(make())
    assert "height" not in selector
    assert selector.startswith("bestvideo+bestaudio")


def test_quality_cap_applies_to_every_video_candidate():
    selector = formats.video_selector(make(quality="720"))
    candidates = selector.split("/")
    assert all("[height<=720]" in c for c in candidates if c != "best")


def test_container_preference_is_expressed_before_fallback():
    selector = formats.video_selector(make(quality="1080", container="mp4"))
    assert selector.startswith("bestvideo[height<=1080][ext=mp4]+bestaudio[ext=mp4]")
    # A bare fallback must remain so sites without mp4 still resolve.
    assert selector.endswith("best")


def test_selector_candidates_are_deduplicated():
    selector = formats.video_selector(make())
    candidates = selector.split("/")
    assert len(candidates) == len(set(candidates))


def test_worst_quality_is_its_own_path():
    assert formats.video_selector(make(quality="worst")) == "worstvideo+worstaudio/worst"


def test_audio_only_ignores_video_selector():
    assert formats.selector(make(audio_only=True)) == "bestaudio/best"


def test_merge_container_none_when_auto():
    assert formats.merge_container(make()) is None


def test_merge_container_set_when_explicit():
    assert formats.merge_container(make(container="mkv")) == "mkv"


def test_merge_container_none_for_audio_only():
    assert formats.merge_container(make(audio_only=True, audio_codec="opus")) is None
