from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from providers import (
    AsrPronunciationProvider,
    BasePronunciationProvider,
    ForcedAlignmentPronunciationProvider,
    GoptPronunciationProvider,
    LocalPronunciationProvider,
)
from schemas import EngineName, HealthResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pronunciation-engine")

DEFAULT_PROVIDER: EngineName = "gopt"
ENGINE_TOKEN = os.getenv("PRONUNCIATION_ENGINE_TOKEN") or ""

app = FastAPI(title="El-bannawy Pronunciation Engine", version="1.0.0")


def _build_providers() -> dict[str, BasePronunciationProvider]:
    gopt_path = os.getenv("GOPT_MODEL_PATH") or None
    device = os.getenv("PRONUNCIATION_DEVICE", "cpu")
    return {
        "gopt": GoptPronunciationProvider(model_path=gopt_path, device=device),
        "forced-alignment": ForcedAlignmentPronunciationProvider(device=device),
        "asr": AsrPronunciationProvider(model_size=os.getenv("LOCAL_MODEL_SIZE", "base"), device=device),
        "local": LocalPronunciationProvider(model_size=os.getenv("LOCAL_MODEL_SIZE", "base"), device=device),
    }


PROVIDERS = _build_providers()


def _select_provider(name: Optional[str]) -> BasePronunciationProvider:
    requested = name or DEFAULT_PROVIDER
    provider = PROVIDERS.get(requested)
    if provider is not None and provider.available():
        return provider
    # Fall back to any available provider.
    for cand in PROVIDERS.values():
        if cand.available():
            logger.warning("Provider %s unavailable; using %s", requested, cand.name)
            return cand
    raise HTTPException(
        status_code=503,
        detail=(
            "لا يتوفر محرك تقييم النطق. ثبّت نموذج GOPT أو Montreal Forced Aligner "
            "أو faster-whisper (المزوّد المحلي) حسب توثيق النشر."
        ),
    )


@app.get("/internal/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    available = [name for name, p in PROVIDERS.items() if p.available()]
    default = DEFAULT_PROVIDER if PROVIDERS[DEFAULT_PROVIDER].available() else (available[0] if available else DEFAULT_PROVIDER)
    return HealthResponse(providers=available, defaultProvider=default)  # type: ignore[arg-type]


@app.post("/internal/pronunciation/assess")
async def assess(
    audio: UploadFile = File(...),
    expected_text: str = Form(...),
    provider: Optional[str] = Form(None),
    reference_phonemes: Optional[str] = Form(None),
    sample_rate: Optional[int] = Form(None),
    language: str = Form("en-US"),
    authorization: Optional[str] = None,
):
    if ENGINE_TOKEN:
        token = (authorization or "").replace("Bearer ", "")
        if token != ENGINE_TOKEN:
            raise HTTPException(status_code=401, detail="غير مصرح")

    if not expected_text or not expected_text.strip():
        raise HTTPException(status_code=400, detail="النص المتوقع مطلوب")

    provider_instance = _select_provider(provider)
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="الملف الصوتي فارغ")

    ref_phon: Optional[list[str]] = None
    if reference_phonemes:
        import json

        try:
            parsed = json.loads(reference_phonemes)
            if isinstance(parsed, list):
                ref_phon = [str(p) for p in parsed]
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="صيغة الرموز الصوتية غير صحيحة")

    try:
        result = await provider_instance.assess(
            audio_bytes=audio_bytes,
            expected_text=expected_text,
            reference_phonemes=ref_phon,
            sample_rate=sample_rate,
            language=language,
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Assessment failed")
        raise HTTPException(status_code=500, detail=f"فشل التقييم: {exc}")

    return JSONResponse(content=result.model_dump())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
