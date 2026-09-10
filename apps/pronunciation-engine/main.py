from __future__ import annotations

import logging
import os
import tempfile
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import librosa
import soundfile as sf

from scoring import score_pronunciation
from schemas import HealthResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pronunciation-engine")

app = FastAPI(title="El-bannawy Pronunciation Engine - Accurate", version="2.0.0")

# CORS for local and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Warm up whisper model on startup
_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        # Use tiny for speed, base for accuracy - base is good balance for CPU
        # Model will be downloaded on first use if not cached
        size = os.getenv("WHISPER_SIZE", "base")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute = "int8" if device == "cpu" else "float16"
        logger.info(f"Loading whisper model {size} on {device} ({compute})")
        _whisper_model = WhisperModel(size, device=device, compute_type=compute)
        logger.info("Whisper model loaded")
    return _whisper_model

@app.on_event("startup")
async def warmup():
    try:
        # Pre-load in background thread to avoid blocking startup
        import asyncio
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, get_whisper)
        logger.info("Engine warmed up")
    except Exception as e:
        logger.warning(f"Warmup failed (will load on first request): {e}")

@app.get("/internal/health", response_model=HealthResponse)
async def health():
    # Check if whisper can be loaded
    try:
        import faster_whisper
        import epitran
        available = ["local-accurate"]
        default = "local-accurate"
    except ImportError:
        available = []
        default = "local-accurate"
    return HealthResponse(status="ok", providers=available, defaultProvider=default)

@app.post("/internal/pronunciation/assess")
async def assess(
    audio: UploadFile = File(...),
    expected_text: str = Form(..., alias="expectedText"),
    expected_text_snake: Optional[str] = Form(None, alias="expected_text"),
    language: str = Form("en-US"),
):
    # Support both camelCase and snake_case
    expected = (expected_text or expected_text_snake or "").strip()
    if not expected:
        # Try to get from form directly via alias handling
        expected = expected_text.strip() if expected_text else (expected_text_snake.strip() if expected_text_snake else "")
    if not expected:
        raise HTTPException(status_code=400, detail="النص المتوقع مطلوب")

    # Read audio
    try:
        data = await audio.read()
        if len(data) == 0:
            raise HTTPException(status_code=400, detail="الملف الصوتي فارغ")
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="حجم الملف كبير جداً")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل قراءة الملف: {e}")

    # Save to temp file for librosa/soundfile
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        # Load audio with librosa (handles webm, mp4, wav, etc.)
        y, sr = librosa.load(tmp_path, sr=16000, mono=True)
        if len(y) == 0:
            raise HTTPException(status_code=400, detail="الملف الصوتي فارغ أو تالف")
        # Trim silence at start/end for better scoring
        y_trim, _ = librosa.effects.trim(y, top_db=30)
        if len(y_trim) > 0:
            y = y_trim
        duration = len(y) / 16000
        if duration < 0.3:
            raise HTTPException(status_code=400, detail="التسجيل قصير جداً، حاول مرة أخرى بصوت أوضح")
        if duration > 10:
            # Trim to 10s max
            y = y[:16000*10]

        # Transcribe with faster-whisper
        model = get_whisper()
        segments, _ = model.transcribe(
            y,
            language="en" if language.startswith("en") else None,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300),
        )
        transcript = " ".join(seg.text.strip() for seg in segments).strip()
        if not transcript:
            transcript = ""

        # Score with phonetic accurate method
        result = score_pronunciation(expected, transcript, y, 16000)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Assessment failed")
        raise HTTPException(status_code=500, detail=f"فشل التقييم: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass
