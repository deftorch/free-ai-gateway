import { NextResponse } from "next/server";
import { db } from "@free-ai-gateway/database";
import { providers, models, apiKeys } from "@free-ai-gateway/database";
import { encryptApiKey } from "@free-ai-gateway/core";
import { eq } from "drizzle-orm";

import { featureFlags } from "@free-ai-gateway/core";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!featureFlags.isDiscoveryEnabled()) {
    return NextResponse.json(
      { error: { message: "Fitur Auto-Discovery dinonaktifkan via ENABLE_DISCOVERY=false", type: "feature_disabled" } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { baseUrl, apiKey = "", label = "Local/Custom LLM" } = body;

    if (!baseUrl || typeof baseUrl !== "string") {
      return NextResponse.json(
        { error: { message: "baseUrl wajib diisi dan berupa string URL valid", type: "invalid_input" } },
        { status: 400 }
      );
    }

    // Normalisasi URL
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const targetModelsEndpoint = normalizedBaseUrl.endsWith("/models")
      ? normalizedBaseUrl
      : `${normalizedBaseUrl}/models`;

    // Persiapkan request ke endpoint /v1/models target
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (apiKey && apiKey.trim() !== "") {
      headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    }

    let res: Response;
    try {
      res = await fetch(targetModelsEndpoint, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10000), // timeout 10s
      });
    } catch (fetchErr: unknown) {
      const err = fetchErr as Error;
      return NextResponse.json(
        {
          error: {
            message: `Gagal terhubung ke endpoint ${targetModelsEndpoint}: ${err.message}`,
            type: "discovery_connection_failed",
          },
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: {
            message: `Endpoint ${targetModelsEndpoint} merespon HTTP status ${res.status}: ${errText.slice(0, 200)}`,
            type: "discovery_connection_failed",
          },
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawList = Array.isArray(data) ? data : data.data || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: `Endpoint ${targetModelsEndpoint} mengembalikan 0 model. Pastikan server lokal sudah memiliki model terinstal (misal: 'ollama run llama3').`,
            type: "no_models_found",
          },
        },
        { status: 422 }
      );
    }

    // Generate Provider ID yang stabil berbasis label/host
    const hostname = new URL(normalizedBaseUrl.startsWith("http") ? normalizedBaseUrl : `http://${normalizedBaseUrl}`).hostname;
    const providerId = `custom-${hostname.replace(/[^a-z0-9]/gi, "-")}`;

    // 1. Upsert Provider
    await db
      .insert(providers)
      .values({
        id: providerId,
        name: label,
        baseUrl: normalizedBaseUrl,
        authType: apiKey ? "bearer" : "none",
        catalogSource: "custom",
      })
      .onConflictDoUpdate({
        target: providers.id,
        set: {
          name: label,
          baseUrl: normalizedBaseUrl,
          authType: apiKey ? "bearer" : "none",
        },
      });

    // 2. Simpan API Key jika disediakan atau dummy key untuk local node
    const dummyKey = apiKey && apiKey.trim() !== "" ? apiKey.trim() : "local-node-key-no-auth";
    const encryptedKey = await encryptApiKey(dummyKey);

    // Cek apakah key sudah ada untuk provider ini
    const existingKeys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.providerId, providerId));

    if (existingKeys.length === 0) {
      await db.insert(apiKeys).values({
        providerId,
        label: `${label} Key`,
        keyEncrypted: encryptedKey,
        status: "active",
      });
    }

    // 3. Upsert Discovered Models
    const registeredModels: Array<{ id: string; name: string }> = [];

    for (const item of rawList) {
      const rawModelId = typeof item === "string" ? item : item.id || item.name;
      if (!rawModelId) continue;

      const fullModelId = `${providerId}/${rawModelId}`;
      const displayName = `${rawModelId} (${label})`;

      await db
        .insert(models)
        .values({
          id: fullModelId,
          providerId,
          displayName,
          contextWindow: item.context_length || item.max_tokens || 8192,
          status: "active",
          tags: ["custom", "local"],
          needsReview: false,
        })
        .onConflictDoUpdate({
          target: models.id,
          set: {
            displayName,
            status: "active",
            needsReview: false,
          },
        });

      registeredModels.push({ id: fullModelId, name: displayName });
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: providerId,
        name: label,
        baseUrl: normalizedBaseUrl,
      },
      discoveredCount: registeredModels.length,
      models: registeredModels,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[discovery] Error during local/custom model discovery:", error);
    return NextResponse.json(
      {
        error: {
          message: error.message || "Gagal melakukan discovery model custom",
          type: "internal_discovery_error",
        },
      },
      { status: 500 }
    );
  }
}
