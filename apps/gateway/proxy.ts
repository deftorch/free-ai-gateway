import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { featureFlags } from "@free-ai-gateway/core/src/config/feature-flags";
import { analyzeNetworkWAF } from "@free-ai-gateway/core/src/validation/waf";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. WAF: Deteksi IP dan Geo-Blocking (Langkah 4.2)
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const country = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || undefined;
  
  if (pathname.startsWith("/v1") || pathname.startsWith("/api") || pathname.startsWith("/internal")) {
    const wafResult = await analyzeNetworkWAF(ip, country);
    if (!wafResult.allowed) {
      return NextResponse.json(
        { error: "Access Denied", reason: wafResult.reason }, 
        { status: wafResult.code || 403 }
      );
    }
  }

  // Jika Dashboard dinonaktifkan via ENABLE_DASHBOARD=false, blok akses ke /dashboard
  if (pathname.startsWith("/dashboard") && !featureFlags.isDashboardEnabled()) {
    return new NextResponse("Admin Dashboard is disabled via ENABLE_DASHBOARD=false", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Tangani seluruh route /v1/*, /api/*, dan /docs
  if (pathname.startsWith("/v1") || pathname.startsWith("/api") || pathname === "/docs") {
    // 1. Preflight CORS handling untuk HTTP OPTIONS
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, anthropic-version",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Lanjutkan request dan tambahkan header CORS & Rate-Limit standar pada response
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/v1/:path*", "/api/:path*", "/docs", "/dashboard/:path*", "/internal/:path*"],
};
