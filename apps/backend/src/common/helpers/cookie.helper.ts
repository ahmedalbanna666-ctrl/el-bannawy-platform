import type { Response } from "express";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessExpiresIn: number,
): void {
  const isProduction = process.env.NODE_ENV === "production";
  // Web (vercel.app) and API (railway.app) are different sites — SameSite=None
  // (+ Secure) is required for the browser to send the auth cookies cross-site.
  const sameSite: "none" | "lax" = isProduction ? "none" : "lax";

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
    maxAge: accessExpiresIn * 1000,
    signed: true,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    signed: true,
  });
}

export function clearAuthCookies(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite: "none" | "lax" = isProduction ? "none" : "lax";
  // Match the exact attributes used by setAuthCookies so the browser deletes them.
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/", secure: isProduction, sameSite });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/v1/auth", secure: isProduction, sameSite });
}
