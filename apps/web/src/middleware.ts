import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];
const AUTH_COOKIE = "access_token";

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded: { exp: number } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(AUTH_COOKIE)?.value;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (pathname === "/") {
    if (accessToken && !isTokenExpired(accessToken)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isProtected) {
    if (!accessToken || isTokenExpired(accessToken)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAuthPage && accessToken && !isTokenExpired(accessToken)) {
    const isOAuthCompletion =
      pathname === "/register" && request.nextUrl.searchParams.get("oauth") !== null;
    if (!isOAuthCompletion) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
