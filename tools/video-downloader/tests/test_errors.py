import pytest

from vdl import errors


@pytest.mark.parametrize(
    "message, expected",
    [
        ("ERROR: This video is DRM protected", errors.ProtectedContentError),
        ("This video is private", errors.ProtectedContentError),
        ("Join this channel to get access to members-only content",
         errors.ProtectedContentError),
        ("Sign in to confirm you're not a bot", errors.ProtectedContentError),
        ("Unsupported URL: https://example.com/x", errors.UnsupportedUrlError),
        ("Unable to download webpage: The read operation timed out", errors.NetworkError),
        ("[generic] gone: Unable to download webpage: HTTP Error 404: Not Found",
         errors.NotFoundError),
        ("Unable to download webpage: HTTP Error 410: Gone", errors.NotFoundError),
        ("Unable to download webpage: HTTP Error 451: Unavailable For Legal Reasons",
         errors.NotFoundError),
        ("Unable to download webpage: HTTP Error 403: Forbidden",
         errors.ProtectedContentError),
        ("Unable to download webpage: HTTP Error 401: Unauthorized",
         errors.ProtectedContentError),
        ("Unable to download webpage: HTTP Error 429: Too Many Requests",
         errors.NetworkError),
        ("Unable to download webpage: HTTP Error 503: Service Unavailable",
         errors.NetworkError),
        ("Connection reset by peer", errors.NetworkError),
        ("ffmpeg exited with code 1", errors.MergeError),
        ("something entirely new", errors.VdlError),
    ],
)
def test_classification(message, expected):
    assert errors.classify(message) is expected


def test_classification_is_case_insensitive():
    assert errors.classify("VIDEO UNAVAILABLE") is errors.ProtectedContentError


def test_protected_content_beats_network_marker():
    # A DRM wall reported alongside a transport hiccup must not be retried.
    message = "This video is DRM protected; connection reset"
    assert errors.classify(message) is errors.ProtectedContentError


def test_only_network_errors_retry():
    assert errors.is_retryable(errors.NetworkError("x")) is True
    assert errors.is_retryable(errors.ProtectedContentError("x")) is False
    assert errors.is_retryable(errors.MergeError("x")) is False
    assert errors.is_retryable(errors.NotFoundError("x")) is False
    assert errors.is_retryable(errors.VdlError("x")) is False


def test_permanent_status_wins_over_generic_network_marker():
    # yt-dlp wraps a 404 in "Unable to download webpage", which is also a
    # transient marker. The permanent status must win or we retry a dead URL.
    message = "Unable to download webpage: HTTP Error 404: Not Found"
    assert errors.classify(message) is errors.NotFoundError
    assert errors.is_retryable(errors.classify(message)("x")) is False


def test_exit_codes_are_distinct():
    classes = [
        errors.VdlError, errors.ConfigError, errors.UnsupportedUrlError,
        errors.ProtectedContentError, errors.NetworkError, errors.MergeError,
        errors.NotFoundError,
    ]
    assert len({c.exit_code for c in classes}) == len(classes)
