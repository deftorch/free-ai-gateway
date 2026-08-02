import { processChatRequest } from "@free-ai-gateway/core";

// PENTING: Node.js runtime, BUKAN Edge — lihat checklist §0 (Edge Runtime
// deprecated untuk proyek baru di Vercel). Fluid Compute menangani streaming
// dengan baik di runtime Node.js.
export const runtime = "nodejs";
export const maxDuration = 120; // detik — aman di Hobby (limit 300s) & Pro (800s)

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  let body: unknown;
  const rawText = await req.text();
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Let gateway process it first for Auth 401. We will pass empty object to fail JSON validation (400) if Auth passes.
    body = { __malformed: true }; 
  }

  // Delegasikan logika utama ke Core Headless Engine
  const result = await processChatRequest({
    token: authHeader,
    body: body,
  });

  // Override status code if JSON was malformed and Auth didn't reject it
  if (result.statusCode === 400 && typeof body === "object" && body !== null && "__malformed" in body) {
    return Response.json(
      { error: { message: "Body request bukan JSON yang valid.", type: "invalid_request" } },
      { status: 400 }
    );
  }

  if (result.stream && result.body instanceof ReadableStream) {
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers,
    });
  }

  // Jika bukan stream atau merupakan object/error JSON
  if (typeof result.body === 'object' && result.body !== null) {
    return Response.json(result.body, {
      status: result.statusCode,
      headers: result.headers,
    });
  }

  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers,
  });
}
