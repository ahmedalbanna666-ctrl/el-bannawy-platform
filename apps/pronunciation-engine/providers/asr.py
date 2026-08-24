from __future__ import annotations

from providers.local import LocalPronunciationProvider


class AsrPronunciationProvider(LocalPronunciationProvider):
    """ASR-based provider (whisper-family). In this reference implementation it
    reuses the self-hosted faster-whisper pipeline; swap ``assess`` for a
    different ASR backend if desired. Exposed as the ``asr`` engine name.
    """

    name = "asr"
