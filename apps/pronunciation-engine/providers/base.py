from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from schemas import PronunciationAssessment


class BasePronunciationProvider(ABC):
    """Interface implemented by every pronunciation engine backend.

    A provider turns raw audio + expected text into a normalized
    PronunciationAssessment. Implementations must be safe to instantiate even
    when their heavy ML dependencies are not installed; expose ``available()``
    so the API can report capability without crashing.
    """

    name: str = "base"

    @abstractmethod
    def available(self) -> bool:
        """Return True when the underlying model/dependencies are usable."""

    @abstractmethod
    async def assess(
        self,
        *,
        audio_bytes: bytes,
        expected_text: str,
        reference_phonemes: Optional[list[str]] = None,
        sample_rate: Optional[int] = None,
        language: str = "en-US",
    ) -> PronunciationAssessment:
        """Score a single spoken attempt."""
