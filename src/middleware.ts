import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Lightweight edge check: only verifies a session cookie is present and
// valid before allowing access to /dashboard. Route handlers still do
// their own per-resource ownership checks (see src/lib/auth.ts).
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-me"
);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("fsi_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
