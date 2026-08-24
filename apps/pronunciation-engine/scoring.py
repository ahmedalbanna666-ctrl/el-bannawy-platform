from __future__ import annotations

from schemas import (
    PhonemeAssessment,
    PronunciationAssessment,
    WordAssessment,
    WordErrorType,
)

# Aspect weights used to compute the overall score (must sum to 1.0).
WEIGHTS = {
    "accuracy": 0.5,
    "fluency": 0.2,
    "prosody": 0.15,
    "completeness": 0.15,
}


def clamp_score(value: float) -> float:
    return max(0.0, min(100.0, round(float(value), 1)))


def word_feedback(score: float, error_type: WordErrorType) -> str:
    if error_type == WordErrorType.OMISSION:
        return "الكلمة غير مسموعة — حاول نطقها بوضوح"
    if error_type == WordErrorType.INSERTION:
        return "تم نطق كلمة زائدة عن النص"
    if score >= 85:
        return "نطق ممتاز"
    if score >= 65:
        return "نطق جيد مع بعض الأخطاء"
    if score >= 45:
        return "نطق مقبول — يحتاج تحسيناً"
    return "يلزم تحسين نطق هذه الكلمة"


def normalize_assessment(
    *,
    words: list[dict],
    phonemes: list[dict],
    transcript: str,
    engine: str,
    accuracy: float,
    fluency: float,
    prosody: float,
    completeness: float,
    raw: dict | None = None,
) -> PronunciationAssessment:
    norm_words: list[WordAssessment] = []
    for w in words:
        score = clamp_score(float(w.get("score", 0.0)))
        error_type = WordErrorType(w.get("errorType", "none"))
        phons = [
            PhonemeAssessment(
                symbol=str(p.get("symbol", "")),
                score=clamp_score(float(p.get("score", 0.0))),
                errorType=p.get("errorType", "none"),
                start=p.get("start"),
                end=p.get("end"),
            )
            for p in w.get("phonemes", [])
        ]
        norm_words.append(
            WordAssessment(
                word=str(w.get("word", "")),
                score=score,
                accuracy=clamp_score(float(w.get("accuracy", score))),
                fluency=clamp_score(float(w.get("fluency", score))),
                start=w.get("start"),
                end=w.get("end"),
                errorType=error_type,
                feedback=w.get("feedback") or word_feedback(score, error_type),
                phonemes=phons,
            )
        )

    norm_phonemes = [
        PhonemeAssessment(
            symbol=str(p.get("symbol", "")),
            score=clamp_score(float(p.get("score", 0.0))),
            errorType=p.get("errorType", "none"),
            start=p.get("start"),
            end=p.get("end"),
        )
        for p in phonemes
    ]

    acc = clamp_score(accuracy)
    fl = clamp_score(fluency)
    pr = clamp_score(prosody)
    co = clamp_score(completeness)
    overall = clamp_score(
        acc * WEIGHTS["accuracy"]
        + fl * WEIGHTS["fluency"]
        + pr * WEIGHTS["prosody"]
        + co * WEIGHTS["completeness"]
    )

    return PronunciationAssessment(
        overallScore=overall,
        accuracy=acc,
        fluency=fl,
        prosody=pr,
        completeness=co,
        transcript=transcript or "",
        engine=engine,  # type: ignore[arg-type]
        words=norm_words,
        phonemes=norm_phonemes,
        raw=raw,
    )
