from __future__ import annotations

import io
import logging
import tempfile
from typing import Optional

import numpy as np

from scoring import normalize_assessment
from schemas import PronunciationAssessment, WordErrorType
from providers.base import BasePronunciationProvider
from providers.gopt import _prosody_score, _resample as _gopt_resample

logger = logging.getLogger("pronunciation.local")


def _edit_align(expected: list[str], observed: list[str]):
    """Token-level alignment (Levenshtein backtrace).

    Returns a list of tuples (expected_word, observed_word, error_type) where
    error_type is one of none/mispronunciation/omission/insertion.
    """
    n, m = len(expected), len(observed)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if expected[i - 1].lower() == observed[j - 1].lower() else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    i, j = n, m
    out = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + (
            0 if expected[i - 1].lower() == observed[j - 1].lower() else 1
        ):
            match = expected[i - 1].lower() == observed[j - 1].lower()
            out.append(
                (
                    expected[i - 1],
                    observed[j - 1],
                    WordErrorType.NONE if match else WordErrorType.MISPRONUNCIATION,
                )
            )
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or dp[i][j] == dp[i - 1][j] + 1):
            out.append((expected[i - 1], None, WordErrorType.OMISSION))
            i -= 1
        else:
            out.append((None, observed[j - 1], WordErrorType.INSERTION))
            j -= 1
    out.reverse()
    return out


class LocalPronunciationProvider(BasePronunciationProvider):
    """Self-hosted, CPU-only fallback.

    Uses faster-whisper for ASR (word-level timestamps) then aligns the
    recognized transcript to the expected text to derive word/phoneme level
    scores. No external API calls, no per-request fee. Requires the optional
    ``faster-whisper`` dependency; ``available()`` reports readiness.
    """

    name = "local"

    def __init__(self, model_size: str = "base", device: str = "cpu") -> None:
        self._model_size = model_size
        self._device = device
        self._model = None

    def available(self) -> bool:
        try:
            import faster_whisper  # noqa: F401
            import soundfile  # noqa: F401
        except Exception:  # pragma: no cover
            return False
        return True

    def _load(self):
        if self._model is None:
            from faster_whisper import WhisperModel  # type: ignore

            self._model = WhisperModel(self._model_size, device=self._device)
        return self._model

    async def assess(
        self,
        *,
        audio_bytes: bytes,
        expected_text: str,
        reference_phonemes: Optional[list[str]] = None,
        sample_rate: Optional[int] = None,
        language: str = "en-US",
    ) -> PronunciationAssessment:
        import soundfile as sf  # type: ignore

        audio, sr = sf.read(io.BytesIO(audio_bytes))
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        if sr != 16000:
            audio = _gopt_resample(audio, sr, 16000)
            sr = 16000

        model = self._load()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, audio, sr)
            segments, _info = model.transcribe(
                tmp.name, language="en", word_timestamps=True
            )
            obs_words = []
            for seg in segments:
                for w in seg.words:
                    obs_words.append(
                        {"word": w.word.strip(), "start": w.start, "end": w.end}
                    )

        expected = [w for w in expected_text.split() if w]
        obs_tokens = [w["word"] for w in obs_words]
        alignment = _edit_align(expected, obs_tokens)

        words = []
        phoneme_cursor = 0
        ref_phon = reference_phonemes or []
        for exp_w, obs_w, err in alignment:
            if err == WordErrorType.OMISSION:
                score, acc, fl = 10.0, 10.0, 10.0
            elif err == WordErrorType.INSERTION:
                score, acc, fl = 0.0, 0.0, 0.0
            elif err == WordErrorType.MISPRONUNCIATION:
                score, acc, fl = 55.0, 55.0, 70.0
            else:
                score, acc, fl = 92.0, 92.0, 92.0

            w_phon = []
            if exp_w and phoneme_cursor < len(ref_phon):
                for sym in ref_phon[phoneme_cursor].split():
                    w_phon.append(
                        {
                            "symbol": sym,
                            "score": score if err == WordErrorType.NONE else score * 0.6,
                            "errorType": "none" if err == WordErrorType.NONE else "substitution",
                        }
                    )
            if exp_w:
                phoneme_cursor += 1

            words.append(
                {
                    "word": exp_w or (obs_w or ""),
                    "score": score,
                    "accuracy": acc,
                    "fluency": fl,
                    "start": (obs_w and obs_words[obs_tokens.index(obs_w)]["start"])
                    if obs_w and obs_w in obs_tokens
                    else None,
                    "end": None,
                    "errorType": err.value,
                    "phonemes": w_phon,
                }
            )

        transcript = " ".join(obs_tokens)
        accuracy = round(
            sum(w["accuracy"] for w in words) / max(len(words), 1), 1
        )
        fluency = round(_fluency(obs_words, sr), 1)
        prosody = round(_prosody_score(audio, sr), 1)
        completeness = round(_completeness(words), 1)

        return normalize_assessment(
            words=words,
            phonemes=[p for w in words for p in w["phonemes"]],
            transcript=transcript,
            engine=self.name,
            accuracy=accuracy,
            fluency=fluency,
            prosody=prosody,
            completeness=completeness,
            raw={"mode": "local-asr"},
        )


def _fluency(obs_words: list[dict], sr: int) -> float:  # noqa: ARG001
    if len(obs_words) < 2:
        return 80.0
    durations = [w["end"] - w["start"] for w in obs_words if w.get("end") and w.get("start")]
    if not durations:
        return 80.0
    mean_dur = sum(durations) / len(durations)
    # Ideal English word duration ~0.3-0.5s; penalize very slow/fast.
    if 0.25 <= mean_dur <= 0.6:
        return 90.0
    deviation = min(abs(mean_dur - 0.4) / 0.4, 1.0)
    return round(max(40.0, 90.0 - deviation * 50.0), 1)


def _completeness(words: list[dict]) -> float:
    missing = sum(1 for w in words if w.get("errorType") == "omission")
    return round(100.0 * (len(words) - missing) / max(len(words), 1), 1)
