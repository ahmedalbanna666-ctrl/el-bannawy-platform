from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field

EngineName = Literal["gopt", "forced-alignment", "asr", "local"]


class PhonemeErrorType(str, Enum):
    NONE = "none"
    SUBSTITUTION = "substitution"
    DELETION = "deletion"
    INSERTION = "insertion"


class WordErrorType(str, Enum):
    NONE = "none"
    MISPRONUNCIATION = "mispronunciation"
    OMISSION = "omission"
    INSERTION = "insertion"
    REPETITION = "repetition"


class PhonemeAssessment(BaseModel):
    symbol: str
    score: float
    errorType: PhonemeErrorType = PhonemeErrorType.NONE
    start: Optional[float] = None
    end: Optional[float] = None


class WordAssessment(BaseModel):
    word: str
    score: float
    accuracy: float
    fluency: float
    start: Optional[float] = None
    end: Optional[float] = None
    errorType: WordErrorType = WordErrorType.NONE
    feedback: Optional[str] = None
    phonemes: list[PhonemeAssessment] = Field(default_factory=list)


class PronunciationAssessment(BaseModel):
    overallScore: float
    accuracy: float
    fluency: float
    prosody: float
    completeness: float
    transcript: str
    engine: EngineName
    words: list[WordAssessment] = Field(default_factory=list)
    phonemes: list[PhonemeAssessment] = Field(default_factory=list)
    raw: Optional[dict] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    providers: list[EngineName] = Field(default_factory=list)
    defaultProvider: EngineName = "gopt"
