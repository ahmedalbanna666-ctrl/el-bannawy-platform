// Egyptian mobile number normalization & validation utilities.
//
// Accepted user input formats (normalized internally to +201XXXXXXXXX):
//   01234567890          (local, 11 digits)
//   +201234567890        (international with +)
//   201234567890         (international without +)
//   00201234567890       (international with 00 prefix)
//   with spaces / hyphens / parentheses / leading-trailing spaces
//
// Validation ALWAYS runs against the normalized value.
// Duplicate country prefixes (e.g. +202012..., +20012...) are never produced.

const EGYPT_MOBILE_REGEX = /^\+201[0125]\d{8}$/;

const EMPTY = "";

function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalize any common Egyptian mobile input into the single canonical
 * format: +201XXXXXXXXX. Returns an empty string for empty input and the
 * original (trimmed) input when it cannot be normalized reliably so the
 * caller/DTO validation can reject it.
 */
export function normalizeEgyptMobile(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return EMPTY;

  const digits = extractDigits(trimmed);
  if (digits.length === 0) return EMPTY;

  // Strip leading country-code variants to isolate the national number.
  let local = digits;
  if (local.startsWith("0020")) {
    // 00 (intl access) + 20 (country code)
    local = local.slice(4);
  } else if (local.startsWith("20")) {
    // 20 (country code, with or without leading +)
    local = local.slice(2);
  }

  // National format with trunk prefix: 01XXXXXXXXX (11 digits)
  if (local.startsWith("0") && local.length === 11) {
    return `+2${local}`;
  }

  // National format without trunk prefix: 1XXXXXXXXX (10 digits)
  if (/^1[0125]\d{8}$/.test(local)) {
    return `+20${local}`;
  }

  // Could not normalize reliably — return original for downstream rejection.
  return trimmed;
}

/**
 * Validate a (already normalized) Egyptian mobile number.
 */
export function isValidEgyptMobile(normalized: string): boolean {
  return EGYPT_MOBILE_REGEX.test(normalized);
}

export interface EgyptMobileValidation {
  readonly valid: boolean;
  readonly normalized: string;
  readonly message?: string;
}

/**
 * Normalize then validate a raw Egyptian mobile input, returning a friendly
 * Arabic message when invalid.
 */
export function validateEgyptMobile(input: string): EgyptMobileValidation {
  const normalized = normalizeEgyptMobile(input);

  if (normalized.length === 0) {
    return { valid: false, normalized, message: "رقم الهاتف مطلوب" };
  }

  if (!isValidEgyptMobile(normalized)) {
    return {
      valid: false,
      normalized,
      message: "رقم هاتف غير صحيح. أدخل رقمًا مصريًا صالحًا مثل 01234567890",
    };
  }

  return { valid: true, normalized };
}
