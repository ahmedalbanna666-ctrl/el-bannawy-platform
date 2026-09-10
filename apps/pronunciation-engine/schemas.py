from typing import List, Literal, Optional
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    providers: List[str]
    defaultProvider: str

class WordAssessment(BaseModel):
    word: str
    score: int
    accuracy: int
    fluency: int
    errorType: str
    feedback: str
    phonemes: List[dict]

class PhonemeAssessment(BaseModel):
    symbol: str
    score: int
    errorType: str

class PronunciationAssessmentResult(BaseModel):
    overallScore: int
    accuracy: int
    fluency: int
    prosody: int
    completeness: int
    transcript: str
    engine: str
    words: List[WordAssessment]
    phonemes: List[PhonemeAssessment]
