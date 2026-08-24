import type {
  AssessPronunciationOptions,
  PronunciationAssessResponse,
} from "./pronunciation-types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() ?? "http://localhost:4000/api/v1";

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function postForm(
  formData: FormData,
  attemptRefresh: boolean,
): Promise<PronunciationAssessResponse> {
  const res = await fetch(`${API_BASE_URL}/pronunciation/assess`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: formData,
  });

  if (res.status === 401 && attemptRefresh) {
    const refreshed = await refreshToken();
    if (refreshed) return postForm(formData, false);
    throw new Error("انتهت جلستك، يرجى تسجيل الدخول مرة أخرى");
  }

  if (!res.ok) {
    let message = "فشل في تقييم النطق";
    try {
      const data: unknown = await res.json();
      if (typeof data === "object" && data !== null && "message" in data) {
        message = String((data).message);
      }
    } catch {
      // ignore non-JSON bodies
    }
    throw new Error(message);
  }

  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error("استجابة غير صالحة من خدمة النطق");
  }
  return (data as { data: PronunciationAssessResponse }).data;
}

export async function assessPronunciation(
  audio: Blob,
  expectedText: string,
  options: AssessPronunciationOptions = {},
): Promise<PronunciationAssessResponse> {
  const formData = new FormData();
  const ext = (audio.type.includes("wav")
    ? "wav"
    : audio.type.includes("mp4")
      ? "m4a"
      : audio.type.includes("ogg")
        ? "ogg"
        : "webm");
  formData.append("audio", audio, `pronunciation.${ext}`);
  formData.append("expected_text", expectedText);
  if (options.provider) formData.append("provider", options.provider);
  if (options.referencePhonemes) {
    formData.append("reference_phonemes", JSON.stringify(options.referencePhonemes));
  }
  if (options.sampleRate) formData.append("sample_rate", String(options.sampleRate));
  if (options.language) formData.append("language", options.language);

  return postForm(formData, true);
}
