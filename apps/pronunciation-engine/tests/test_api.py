from __future__ import annotations

import io
import json

import pytest
from fastapi.testclient import TestClient

import main
from providers.base import BasePronunciationProvider
from schemas import PronunciationAssessment


class FakeProvider(BasePronunciationProvider):
    name = "fake"

    def available(self) -> bool:
        return True

    async def assess(
        self,
        *,
        audio_bytes: bytes,
        expected_text: str,
        reference_phonemes=None,
        sample_rate=None,
        language: str = "en-US",
    ) -> PronunciationAssessment:  # noqa: ARG002
        return PronunciationAssessment(
            overallScore=88.0,
            accuracy=90.0,
            fluency=80.0,
            prosody=85.0,
            completeness=100.0,
            transcript="hello world",
            engine="fake",  # type: ignore[arg-type]
            words=[
                {
                    "word": "hello",
                    "score": 90.0,
                    "accuracy": 90.0,
                    "fluency": 90.0,
                    "errorType": "none",
                    "phonemes": [{"symbol": "HH", "score": 95.0}],
                },
                {
                    "word": "world",
                    "score": 85.0,
                    "accuracy": 85.0,
                    "fluency": 85.0,
                    "errorType": "none",
                    "phonemes": [{"symbol": "W", "score": 85.0}],
                },
            ],
            phonemes=[{"symbol": "HH", "score": 95.0}, {"symbol": "W", "score": 85.0}],
        )


@pytest.fixture()
def client():
    main.PROVIDERS = {"fake": FakeProvider()}
    main.DEFAULT_PROVIDER = "fake"  # type: ignore[assignment]
    with TestClient(main.app) as c:
        yield c


def test_health(client: TestClient):
    res = client.get("/internal/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "fake" in body["providers"]


def test_assess_returns_normalized_result(client: TestClient):
    wav = (b"RIFF" + b"\x00" * 40)  # non-real audio; fake provider ignores it
    res = client.post(
        "/internal/pronunciation/assess",
        files={"audio": ("rec.wav", io.BytesIO(wav), "audio/wav")},
        data={"expected_text": "hello world"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["overallScore"] == 88.0
    assert body["engine"] == "fake"
    assert len(body["words"]) == 2
    assert body["words"][0]["feedback"]  # arabic feedback generated


def test_assess_missing_text(client: TestClient):
    wav = b"RIFF\x00" * 10
    res = client.post(
        "/internal/pronunciation/assess",
        files={"audio": ("rec.wav", io.BytesIO(wav), "audio/wav")},
        data={"expected_text": "  "},
    )
    assert res.status_code == 400


def test_assess_reference_phonemes_parsed(client: TestClient):
    wav = b"RIFF\x00" * 10
    res = client.post(
        "/internal/pronunciation/assess",
        files={"audio": ("rec.wav", io.BytesIO(wav), "audio/wav")},
        data={
            "expected_text": "hello",
            "reference_phonemes": json.dumps([["HH", "AH", "L", "OW"]]),
        },
    )
    assert res.status_code == 200
