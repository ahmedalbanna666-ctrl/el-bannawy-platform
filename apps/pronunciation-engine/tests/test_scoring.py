from __future__ import annotations

from scoring import clamp_score, normalize_assessment, word_feedback
from schemas import WordErrorType


def test_clamp_score_bounds():
    assert clamp_score(-10) == 0.0
    assert clamp_score(150) == 100.0
    assert clamp_score(73.6) == 73.6


def test_overall_weighted_average():
    result = normalize_assessment(
        words=[{"word": "a", "score": 100, "accuracy": 100, "fluency": 100}],
        phonemes=[{"symbol": "AH", "score": 100}],
        transcript="a",
        engine="fake",  # type: ignore[arg-type]
        accuracy=100,
        fluency=0,
        prosody=0,
        completeness=100,
    )
    # 100*0.5 + 0*0.2 + 0*0.15 + 100*0.15 = 65.0
    assert result.overallScore == 65.0


def test_word_feedback_thresholds():
    assert "ممتاز" in word_feedback(90, WordErrorType.NONE)
    assert "مسموعة" in word_feedback(0, WordErrorType.OMISSION)
