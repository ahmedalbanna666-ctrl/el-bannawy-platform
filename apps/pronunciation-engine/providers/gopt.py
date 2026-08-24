from __future__ import annotations

import io
import logging
from typing import Optional

import numpy as np

from scoring import normalize_assessment
from schemas import PronunciationAssessment
from providers.base import BasePronunciationProvider

logger = logging.getLogger("pronunciation.gopt")

# GOPT produces Goodness Of Pronunciation (GOP) scores per phoneme in [0, 1].
# We map GOP -> 0..100 via a logistic-style scaling tuned for intelligibility.
GOP_SCALE = 100.0


class GoptPronunciationProvider(BasePronunciationProvider):
    """Primary engine: GOPT (multi-aspect, multi-granularity) + Montreal Forced
    Aligner for word/phoneme timing.

    Requires:
      - gopt (https://github.com/YuanGongND/gopt) with a pretrained checkpoint
      - montreal-forced-aligner + an English acoustic model
    Both are large downloads and are loaded lazily; ``available()`` reports
    whether they are installed and a checkpoint path is configured.
    """

    name = "gopt"

    def __init__(self, model_path: Optional[str] = None, device: str = "cpu") -> None:
        self._model_path = model_path
        self._device = device
        self._model = None

    def available(self) -> bool:
        if not self._model_path:
            return False
        try:
            import gopt  # noqa: F401  (importable only when installed)
            import montreal_forced_aligner  # noqa: F401
        except Exception:  # pragma: no cover - depends on optional deps
            return False
        return True

    def _load_model(self):
        if self._model is not None:
            return self._model
        # Lazy import keeps the service importable without the heavy deps.
        from gopt import GoptModel  # type: ignore

        self._model = GoptModel.from_pretrained(self._model_path, device=self._device)
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
            # Resample lazily if needed by the underlying toolkit.
            audio = self._resample(audio, sr, 16000)
            sr = 16000

        model = self._load_model()
        # 1) Forced alignment (MFA) -> word/phoneme segments + transcript.
        alignment = self._align(audio, sr, expected_text)
        # 2) GOPT GOP scoring per phoneme.
        gop = model.score(audio, sr, alignment["words"])

        words = []
        phonemes = []
        for w in alignment["words"]:
            w_phon = []
            for ph in w["phonemes"]:
                score = clamp_gop(gop.get((w["word"], ph["symbol"]), 0.0))
                ph_entry = {
                    "symbol": ph["symbol"],
                    "score": score,
                    "errorType": ph.get("errorType", "none"),
                    "start": ph.get("start"),
                    "end": ph.get("end"),
                }
                w_phon.append(ph_entry)
                phonemes.append(ph_entry)
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
            raw={"gopt": True},
        )

    # --- helpers that wrap MFA; implemented as thin adapters ---------------
    def _align(self, audio, sr, text):  # pragma: no cover - needs MFA
        from montreal_forced_aligner import Aligner  # type: ignore

        aligner = Aligner(language="english_us_arpa")
        return aligner.align(audio, sr, text)

    @staticmethod
    def _resample(audio: np.ndarray, src: int, dst: int) -> np.ndarray:
        import resampy  # type: ignore

        return resampy.resample(audio, src, dst)


def clamp_gop(gop: float) -> float:
    return max(0.0, min(100.0, round(float(gop) * GOP_SCALE, 1)))


def _resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    """Resample a 1-D audio array via linear interpolation (no scipy)."""
    if orig_sr == target_sr or audio.size == 0:
        return audio
    duration = audio.shape[-1] / float(orig_sr)
    target_len = max(1, int(round(duration * target_sr)))
    x_old = np.linspace(0.0, duration, num=audio.shape[-1], endpoint=False)
    x_new = np.linspace(0.0, duration, num=target_len, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(audio.dtype)


def _mean(values: list[float]) -> float:
    return sum(values) / max(len(values), 1)


def _completeness(words: list[dict]) -> float:
    missing = sum(1 for w in words if w.get("errorType") == "omission")
    return round(100.0 * (len(words) - missing) / max(len(words), 1), 1)


def _prosody_score(audio: np.ndarray, sr: int) -> float:
    """Lightweight proxy: low-variance energy contour => steadier prosody."""
    frame = int(sr * 0.02)
    if len(audio) < frame * 2:
        return 70.0
    energy = np.array(
        [np.sqrt(np.mean(audio[i : i + frame] ** 2)) for i in range(0, len(audio) - frame, frame)]
    )
    if energy.mean() == 0:
        return 0.0
    cv = float(np.std(energy) / (energy.mean() + 1e-9))
    return round(max(0.0, min(100.0, 100.0 - cv * 60.0)), 1)
