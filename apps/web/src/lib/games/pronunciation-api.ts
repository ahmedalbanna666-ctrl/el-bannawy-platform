import type { PronunciationAssessmentResult } from "./pronunciation-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";

async function refreshToken(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/auth/refresh-token`, { method: "POST", credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
    return r.ok;
  } catch { return false; }
}

async function postForm(form: FormData, retry: boolean): Promise<PronunciationAssessmentResult> {
  const res = await fetch(`${API_BASE}/pronunciation/assess`, { method: "POST", credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" }, body: form });
  if (res.status === 401 && retry) {
    if (await refreshToken()) return postForm(form, false);
    throw new Error("انتهت الجلسة، سجل دخول مرة أخرى");
  }
  if (!res.ok) {
    let msg = "فشل التقييم";
    try { const d: unknown = await res.json(); if (typeof d === "object" && d !== null && "message" in d) msg = String((d as { message: unknown }).message); } catch {}
    throw new Error(msg);
  }
  const j: unknown = await res.json();
  if (typeof j !== "object" || j === null || !("data" in j)) throw new Error("استجابة غير صالحة");
  return (j as { data: PronunciationAssessmentResult }).data;
}

export async function assessPronunciation(audio: Blob, expectedText: string): Promise<PronunciationAssessmentResult> {
  const fd = new FormData();
  const ext = audio.type.includes("wav") ? "wav" : audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  fd.append("audio", audio, `p.${ext}`);
  fd.append("expectedText", expectedText);
  return postForm(fd, true);
}
