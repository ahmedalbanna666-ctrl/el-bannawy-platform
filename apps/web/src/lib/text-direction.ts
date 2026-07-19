const ARABIC_SCRIPT_PATTERN = /\p{Script=Arabic}/u;

export function detectTextDirection(text: string): "rtl" | "ltr" {
  for (const char of text) {
    if (ARABIC_SCRIPT_PATTERN.test(char)) {
      return "rtl";
    }
    if (/[A-Za-z]/.test(char)) {
      return "ltr";
    }
  }
  return "ltr";
}
