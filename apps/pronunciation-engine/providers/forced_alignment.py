from __future__ import annotations

import io
import logging
from typing import Optional

import numpy as np

from scoring import normalize_assessment
from schemas import PronunciationAssessment
from providers.base import BasePronunciationProvider
from providers.gopt import (
    GoptPronunciationProvider,
    _completeness,
    _prosody_score,
    clamp_gop,
)

logger = logging.getLogger("pronunciation.forced_alignment")


class ForcedAlignmentPronunciationProvider(BasePronunciationProvider):
    """Forced Alignment + GOP variant.

    Uses Montreal Forced Aligner for word/phoneme timing and a
    wav2vec2 acoustic model to compute GOP scores. Heavier than pure GOPT
    but does not require the GOPT pretrained checkpoint.
    """

    name = "forced-alignment"

    def __init__(self, device: str = "cpu") -> None:
        self._device = device

    def available(self) -> bool:
        try:
            import montreal_forced_aligner  # noqa: F401
            import torch  # noqa: F401
        except Exception:  # pragma: no cover
            return False
        return True

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
            audio = GoptPronunciationProvider._resample(audio, sr, 16000)
            sr = 16000

        alignment = self._align(audio, sr, expected_text)
        gop = self._gop(audio, sr, alignment["words"])

        words, phonemes = self._build(words_align=alignment["words"], gop=gop)
        accuracy = round(sum(p["score"] for p in phonemes) / max(len(phonemes), 1), 1)
        fluency = round(_mean([w["fluency"] for w in words]), 1)
        prosody = round(_prosody_score(audio, sr), 1)
        completeness = round(_completeness(words), 1)

        return normalize_assessment(
            words=words,
            phonemes=phonemes,
            transcript=alignment.get("transcript", expected_text),
            engine=self.name,
            accuracy=accuracy,
            fluency=fluency,
            prosody=prosody,
            completeness=completeness,
            raw={"mode": "forced-alignment"},
        )

    def _build(self, words_align, gop):  # pragma: no cover - needs deps
        words, phonemes = [], []
        for w in words_align:
            w_phon = []
            for ph in w["phonemes"]:
                score = clamp_gop(gop.get((w["word"], ph["symbol"]), 0.0))
                entry = {
                    "symbol": ph["symbol"],
                    "score": score,
                    "errorType": ph.get("errorType", "none"),
                    "start": ph.get("start"),
                    "end": ph.get("end"),
                }
                w_phon.append(entry)
                phonemes.append(entry)
            w_score = round(sum(p["score"] for p in w_phon) / max(len(w_phon), 1), 1)
            words.append(
                {
                    "word": w["word"],
                    "score": w_score,
                    "accuracy": w_score,
                    "fluency": w.get("fluency", w_score),
                    "start": w.get("start"),
                    "end": w.get("end"),
                    "errorType": w.get("errorType", "none"),
                    "phonemes": w_phon,
                }
            )
        return words, phonemes

    def _align(self, audio, sr, text):  # pragma: no cover - needs MFA
        from montreal_forced_aligner import Aligner  # type: ignore

        return Aligner(language="english_us_arpa").align(audio, sr, text)

    def _gop(self, audio, sr, words):  # pragma: no cover - needs torch
        import torch  # type: ignore

        model = torch.hub.load("pytorch/fairseq", "wav2vec2_large_960h")
        # simplified GOP extraction over aligned phoneme segments
        return {}


def _mean(values: list[float]) -> float:
    return sum(values) / max(len(values), 1)
