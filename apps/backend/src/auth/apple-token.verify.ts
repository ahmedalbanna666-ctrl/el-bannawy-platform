import { createPublicKey, createVerify } from "node:crypto";
import { UnauthorizedException, Logger } from "@nestjs/common";

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";
const MAX_CLOCK_SKEW_SECONDS = 300;

interface AppleJwk {
  readonly kty?: string;
  readonly kid?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
  readonly x?: string;
  readonly y?: string;
  readonly crv?: string;
  readonly use?: string;
}

interface AppleJwksResponse {
  readonly keys?: AppleJwk[];
}

let cachedKeys: AppleJwk[] | null = null;
let cachedKeysAt = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

async function fetchAppleJwks(): Promise<AppleJwk[]> {
  if (cachedKeys && Date.now() - cachedKeysAt < CACHE_TTL_MS) {
    return cachedKeys;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(APPLE_JWKS_URL, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Apple JWKS request failed with HTTP ${String(response.status)}`);
    }
    const data = (await response.json()) as AppleJwksResponse;
    const keys = Array.isArray(data.keys) ? data.keys : [];
    cachedKeys = keys;
    cachedKeysAt = Date.now();
    return keys;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeJwtSegment(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded.padEnd(Math.ceil(padded.length / 4) * 4, "=");
  return Buffer.from(withPadding, "base64").toString("utf8");
}

function jwkToPem(jwk: AppleJwk): string {
  if (jwk.kty === "RSA" && jwk.n && jwk.e) {
    const modulus = Buffer.from(jwk.n.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const exponent = Buffer.from(jwk.e.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    const der = Buffer.concat([
      Buffer.from([
        0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
        0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0f, 0x00,
        0x30, 0x82, 0x01, 0x0a, 0x02, 0x82, 0x01, 0x01, 0x00,
      ]),
      modulus,
      Buffer.from([0x02, 0x03]),
      exponent,
    ]);

    const base64 = der.toString("base64");
    const pemLines = (base64.match(/.{1,64}/g) ?? []).join("\n");
    return `-----BEGIN PUBLIC KEY-----\n${pemLines}\n-----END PUBLIC KEY-----`;
  }

  if (jwk.kty === "EC" && jwk.crv === "P-256" && jwk.x && jwk.y) {
    const x = Buffer.from(jwk.x.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const y = Buffer.from(jwk.y.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    const der = Buffer.concat([
      Buffer.from([
        0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
        0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
        0x42, 0x00, 0x04,
      ]),
      x,
      y,
    ]);

    const base64 = der.toString("base64");
    const pemLines = (base64.match(/.{1,64}/g) ?? []).join("\n");
    return `-----BEGIN PUBLIC KEY-----\n${pemLines}\n-----END PUBLIC KEY-----`;
  }

  throw new Error("Unsupported JWK key type");
}

function verifyJwtSignature(token: string, jwk: AppleJwk): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2]?.replace(/-/g, "+").replace(/_/g, "/") ?? "", "base64");

  try {
    const pem = jwkToPem(jwk);
    const publicKey = createPublicKey(pem);
    const algorithm = jwk.alg === "RS256" ? "sha256" : "sha256";
    const verifier = createVerify(algorithm);
    verifier.update(signingInput);
    return verifier.verify(publicKey, signature);
  } catch {
    return false;
  }
}

export async function verifyAppleIdToken(token: string, expectedAudience: string): Promise<{ sub: string; email?: string }> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedException("Invalid Apple id_token");
  }

  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(decodeJwtSegment(parts[0] ?? "")) as { kid?: string; alg?: string };
  } catch {
    throw new UnauthorizedException("Invalid Apple id_token header");
  }

  if (header.alg !== "ES256" && header.alg !== "RS256") {
    throw new UnauthorizedException("Unsupported Apple id_token algorithm");
  }

  let payload: { iss?: string; aud?: unknown; sub?: string; email?: string; exp?: number; iat?: number };
  try {
    payload = JSON.parse(decodeJwtSegment(parts[1] ?? "")) as {
      iss?: string;
      aud?: unknown;
      sub?: string;
      email?: string;
      exp?: number;
      iat?: number;
    };
  } catch {
    throw new UnauthorizedException("Invalid Apple id_token payload");
  }

  if (payload.iss !== APPLE_ISSUER) {
    throw new UnauthorizedException("Apple id_token issuer mismatch");
  }

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!expectedAudience || !aud.includes(expectedAudience)) {
    throw new UnauthorizedException("Apple id_token audience mismatch");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now > payload.exp + MAX_CLOCK_SKEW_SECONDS) {
    throw new UnauthorizedException("Apple id_token has expired");
  }

  const keys = await fetchAppleJwks();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) {
    throw new UnauthorizedException("Apple id_token signing key not found");
  }

  const valid = verifyJwtSignature(token, key);
  if (!valid) {
    Logger.warn("Apple id_token signature verification failed", "AuthService");
    throw new UnauthorizedException("Apple id_token signature verification failed");
  }

  if (!payload.sub) {
    throw new UnauthorizedException("Apple id_token missing subject");
  }

  return { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}
