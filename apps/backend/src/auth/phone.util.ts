const EGYPT_MOBILE_REGEX = /^\+201[0125]\d{8}$/;

function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function normalizeEgyptMobile(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";

  const digits = extractDigits(trimmed);
  if (digits.length === 0) return "";

  let local = digits;
  if (local.startsWith("0020")) {
    local = local.slice(4);
  } else if (local.startsWith("20")) {
    local = local.slice(2);
  }

  if (local.startsWith("0") && local.length === 11) {
    return `+2${local}`;
  }

  if (/^1[0125]\d{8}$/.test(local)) {
    return `+20${local}`;
  }

  return trimmed;
}

export function isValidEgyptMobile(normalized: string): boolean {
  return EGYPT_MOBILE_REGEX.test(normalized);
}
