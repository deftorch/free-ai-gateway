import { db } from "@free-ai-gateway/database";
import { models } from "@free-ai-gateway/database";
import { eq } from "drizzle-orm";
import { checkIpRateLimit } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const rateLimit = await checkIpRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too Many Requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  let dbModels: Array<{ id: string; displayName: string | null }> = [];

  try {
    dbModels = await db
      .select({ id: models.id, displayName: models.displayName })
      .from(models)
      .where(eq(models.status, "active"));
  } catch (err) {
    return Response.json({ error: "Gagal mengambil daftar model.", details: String(err) }, { status: 500 });
  }

  const modelList = [
    {
      name: "auto",
      model: "auto",
      modified_at: new Date().toISOString(),
      size: 7000000000,
      digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      details: {
        format: "gguf",
        family: "llama",
        families: ["llama"],
        parameter_size: "7B",
        quantization_level: "Q4_0",
      },
    },
    ...dbModels.map((m) => ({
      name: m.id,
      model: m.id,
      modified_at: new Date().toISOString(),
      size: 70000000000,
      digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      details: {
        format: "gguf",
        family: m.id.includes("llama") ? "llama" : "gemini",
        families: [m.id.includes("llama") ? "llama" : "gemini"],
        parameter_size: "70B",
        quantization_level: "Q4_0",
      },
    })),
  ];

  return Response.json({ models: modelList });
}
