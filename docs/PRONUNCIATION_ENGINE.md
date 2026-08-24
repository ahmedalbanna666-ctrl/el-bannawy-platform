# نظام تقييم النطق الإنجليزي (Self-Hosted Pronunciation Assessment)

نظام تقييم نطق ذاتي الاستضافة (Self-Hosted) ومجاني لكل طلب، بديل عن
`Web Speech API` (غير الدقيق) و`Azure Pronunciation Assessment` (المدفوع لكل طلب).
يعتمد على نموذج **GOPT** (Goodness Of Pronunciation by Transformer) مع
**Montreal Forced Aligner** للمحاذاة، ومزوّد محلي يعمل على CPU كاحتياطي.

---

## 1. البنية (Architecture)

```
المتصفح (Next.js)
  └─ useAudioRecorder (MediaRecorder) ──► POST /api/v1/pronunciation/assess (multipart)
        │
        ▼
Backend (NestJS) — PronunciationModule
  ├─ PronunciationController  (JwtAuthGuard + تحقق من الملف الصوتي)
  ├─ PronunciationService    (تنسيق + حفظ المحاولة)
  ├─ PronunciationRepository  (Prisma → pronunciation_attempts)
  ├─ ScoringAdapter           (تطبيع الدرجات 0-100 + ملاحظات عربية)
  └─ PronunciationEngineClient (HTTP → خدمة ML)
        │
        ▼
ML Engine (Python FastAPI) — apps/pronunciation-engine
  ├─ /internal/health
  ├─ /internal/pronunciation/assess
  └─ providers:
       ├─ GOPT                      (أساسي: GOPT + MFA)
       ├─ Forced Alignment + GOP    (MFA + wav2vec2)
       ├─ ASR                       (whisper + GOP)
       └─ Local                     (faster-whisper، CPU-only)
```

الواجهة الخلفية لا تجري أي حساب ML؛ كل التقييم داخل خدمة الـ ML المنفصلة،
مما يجعل النظام **قابلاً للتوسعة** و**مستقلاً عن المزوّد**.

---

## 2. المسارات (Endpoints)

### `POST /api/v1/pronunciation/assess`
محمي بـ JWT. يقبل `multipart/form-data`:
- `audio` (ملف صوتي: wav/webm/mp4/m4a/ogg، حد أقصى 10MB)
- `expected_text` (النص المتوقع نطقه)
- `provider?` (`gopt` | `forced-alignment` | `asr` | `local`)
- `reference_phonemes?` (JSON array من الرموز الصوتية ARPABET)
- `sample_rate?`, `language?`

يرجع:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "overallScore": 88,
    "accuracy": 90,
    "fluency": 80,
    "prosody": 85,
    "completeness": 100,
    "transcript": "hello",
    "engine": "gopt",
    "words": [
      { "word": "hello", "score": 90, "accuracy": 90, "fluency": 90,
        "errorType": "none", "feedback": "نطق ممتاز",
        "phonemes": [{ "symbol": "HH", "score": 95, "errorType": "none" }] }
    ],
    "phonemes": [{ "symbol": "HH", "score": 95, "errorType": "none" }]
  }
}
```

---

## 3. المقاييس (Metrics)

| المقياس | الوصف |
|---|---|
| `overallScore` | الدرجة الإجمالية (وزن: دقة 50%، طلاقة 20%، نبرة 15%، اكتمال 15%) |
| `accuracy` | دقة النطق على مستوى الصوتيات (phonemes) |
| `fluency` | الطلاقة (معدل الكلام وانتظامه) |
| `prosody` | النبرة (تغيّر طبقة الصوت/الطاقة) |
| `completeness` | اكتمال الكلمات (عدم الحذف) |
| `words` / `phonemes` | تغذية راجعة على مستوى الكلمة والصوت |

كل الدرجات **0-100**، والنصوص المعروضة للطالب بالعربية (انظر `ScoringAdapter`).

---

## 4. التشغيل المحلي (Local Dev)

### الخدمة الخلفية
```bash
# متغير البيئة (اختياري إن كنت تستخدم docker-compose)
PRONUNCIATION_ENGINE_URL=http://localhost:8000
```

### خدمة الـ ML
```bash
cd apps/pronunciation-engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

المزوّد الافتراضي هو `gopt`. إن لم يُضبط `GOPT_MODEL_PATH` أو لم تُثبّت
الاعتماديات الثقيلة، تنتقل الخدمة تلقائياً إلى أي مزوّد متاح
(يفضّل `local` عبر faster-whisper على CPU).

---

## 5. النشر (Deployment)

`docker-compose.yml` يحوي خدمة `ml-pronunciation` جاهزة:
```bash
docker compose up -d backend ml-pronunciation web
```
على منصات مثل Railway: انشر الخدمة الخلفية وواجهة الويب كما هي،
وانشر مجلد `apps/pronunciation-engine` كخدمة منفصلة، ثم اضبط
`PRONUNCIATION_ENGINE_URL` في الخدمة الخلفية ليشير إلى عنوان خدمة الـ ML.

متغيرات البيئة لخدمة الـ ML:
- `PRONUNCIATION_ENGINE_TOKEN` (اختياري، يُنصح به في الإنتاج)
- `PRONUNCIATION_DEVICE` (`cpu` | `cuda`)
- `GOPT_MODEL_PATH` (مسار نقطة فحص GOPT مُدرّبة)
- `LOCAL_MODEL_SIZE` (`tiny` | `base` | `small` ...)

---

## 6. ملاحظات الترخيص (License / Redistribution) — مهم

قبل استخدام أي نموذج مُدرّب أو مجموعة بيانات، يجب التحقق من:
1. **ترخيص الكود** (مستودع GOPT: `YuanGongND/gopt` — MIT).
2. **ترخيص النموذج المُدرّب** (نقطة الفحص نفسها).
3. **ترخيص مجموعة البيانات** (إن وُضعت أثناء التدريب).
4. **قيود إعادة التوزيع** (بعض النماذج تمنع إعادة التوزيع التجاري).

حتى تاريخ كتابة هذه الوثيقة لم يُنزّل أي نموذج فعليًا في بيئة التطوير
(البيئة لا تحتوي على Python/بيانات ضخمة). جميع المسارات مُختبرة على
مستوى العقد (API contract) عبر `tests/`، وعلى مستوى الخدمة الخلفية
عبر اختبارات الوحدة. التشغيل الفعلي بنموذج GOPT يتطلب تنزيل الأصول
ورفعها إلى `apps/pronunciation-engine/models`.

---

## 7. ملفات التنفيذ

**Backend** (`apps/backend/src/pronunciation/`)
- `pronunciation.types.ts`, `dto/assess-pronunciation.dto.ts`
- `pronunciation.controller.ts`, `pronunciation.service.ts`
- `pronunciation.repository.ts`, `pronunciation.module.ts`
- `engine/pronunciation-engine.client.ts`
- `providers/` (interface, gopt, forced-alignment, asr, local, scoring.adapter)

**قاعدة البيانات**
- `database/prisma/schema.prisma` → نموذج `PronunciationAttempt`
- `database/prisma/migrations/20260824150000_add_pronunciation_attempt`

**ML Engine** (`apps/pronunciation-engine/`)
- `main.py`, `schemas.py`, `scoring.py`, `providers/*.py`
- `requirements.txt`, `Dockerfile`, `.env.example`, `tests/`

**Frontend** (`apps/web/src/`)
- `lib/games/use-audio-recorder.ts` (تسجيل MediaRecorder)
- `lib/games/pronunciation-api.ts` (رفع multipart + مصادقة)
- `lib/games/pronunciation-types.ts`
- `components/games/pronunciation-challenge.tsx` (واجهة النتيجة)
