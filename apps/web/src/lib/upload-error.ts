/**
 * Maps backend upload error responses to user-friendly Arabic messages.
 * Backend error shape: { statusCode, success: false, message, ... }.
 */
export async function parseUploadError(response: Response): Promise<string> {
  let serverMessage = "";
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === "string") {
      serverMessage = data.message;
    }
  } catch {
    serverMessage = "";
  }

  if (/file type|file extension/i.test(serverMessage)) {
    return "صيغة الملف غير مدعومة — ارفع ملف Word بصيغة .docx فقط";
  }
  if (/maximum size/i.test(serverMessage)) {
    return "حجم الملف أكبر من 20MB — قلّل الحجم وحاول مجددًا";
  }
  if (/invalid characters/i.test(serverMessage)) {
    return "اسم الملف يحتوي رموزًا غير مسموحة — أعد تسميته";
  }
  if (/file is required/i.test(serverMessage)) {
    return "لم يتم إرسال الملف — حاول مرة أخرى";
  }
  if (/does not match/i.test(serverMessage)) {
    return "محتوى الملف لا يطابق صيغة .docx — أعد حفظه بهذه الصيغة";
  }
  if (/more than \d+ tables/i.test(serverMessage)) {
    return "الملف يحتوي جداول كثيرة جدًا — قسّم الواجب على ملفين وحاول مجددًا";
  }
  if (/more than \d+ (paragraphs|total rows)/i.test(serverMessage)) {
    return "الملف كبير جدًا — قسّمه على ملفين وحاول مجددًا";
  }
  if (response.status === 503 || response.status === 502 || response.status === 504) {
    return "الخادم غير متاح حاليًا — انتظر دقيقة وحاول مجددًا";
  }
  if (response.status === 401 || response.status === 403) {
    return "انتهت الجلسة أو لا تملك صلاحية الرفع — سجّل الدخول مجددًا";
  }
  return serverMessage || "فشل رفع الملف";
}
