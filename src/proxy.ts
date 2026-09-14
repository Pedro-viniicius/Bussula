import { NextResponse, type NextRequest } from "next/server";
import type { ProxyConfig } from "next/server";

/**
 * Security headers for every HTML response.
 *
 * The CSP is nonce-based: Next.js reads the `x-nonce` request header and
 * stamps the nonce on every script it injects, so no `unsafe-inline` is needed
 * for scripts. No third-party origin is allowed at all.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets nonce'd scripts load the chunks they import.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Style attributes (React, Radix) require unsafe-inline; no inline <script> is allowed.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config: ProxyConfig = {
  matcher: [
    // Everything except static assets and the service worker.
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
