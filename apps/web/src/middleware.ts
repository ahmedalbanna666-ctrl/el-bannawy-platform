import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
