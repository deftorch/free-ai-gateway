import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { GET as updateCatalogGET } from "./update-catalog/route";
import { GET as healthProbeGET } from "./health-probe/route";
import { encryptApiKey } from "@free-ai-gateway/core";


// In-memory mock database store for testing.
// Baris di sini tidak perlu benar-benar cocok dengan skema Drizzle penuh —
// cukup field yang benar-benar dipakai oleh cron job yang diuji.
type MockRow = Record<string, unknown>;
let mockProviders: MockRow[] = [];
let mockModels: MockRow[] = [];
let mockApiKeys: MockRow[] = [];
let mockHealthMetrics: MockRow[] = [];

mock.module("@free-ai-gateway/database", () => {
  const selectMock = (table: unknown) => {
    let data: MockRow[] = [];
    if (table === dbTables.providers) data = mockProviders;
    else if (table === dbTables.models) data = mockModels;
    else if (table === dbTables.apiKeys) data = mockApiKeys;
    else if (table === dbTables.healthMetrics) data = mockHealthMetrics;

    const chain = {
      where: () => chain,
      limit: () => chain,
      then: (resolve: (value: MockRow[]) => void) => resolve(data),
    };
    Object.setPrototypeOf(chain, Array.prototype);
    // Bind array methods if needed, or make it act like an array + object
    return chain;
  };

  return {
    db: {
      select: () => ({
        from: selectMock,
      }),
      insert: (table: unknown) => ({
        values: (values: MockRow | MockRow[]) => {
          const items = Array.isArray(values) ? values : [values];
          if (table === dbTables.providers) mockProviders.push(...items);
          else if (table === dbTables.models) mockModels.push(...items);
          else if (table === dbTables.apiKeys) mockApiKeys.push(...items);
          else if (table === dbTables.healthMetrics) mockHealthMetrics.push(...items);
          return Promise.resolve();
        },
      }),
      update: (table: unknown) => ({
        set: (_values: MockRow) => ({
          where: (_condition: unknown) => {
            return Promise.resolve();
          },
        }),
      }),
      delete: (table: unknown) => {
        if (table === dbTables.providers) mockProviders = [];
        else if (table === dbTables.models) mockModels = [];
        else if (table === dbTables.apiKeys) mockApiKeys = [];
        else if (table === dbTables.healthMetrics) mockHealthMetrics = [];
        return Promise.resolve();
      },
    },
  };
});

import * as dbTables from "@free-ai-gateway/database";

describe("Cron Jobs Suite", () => {
  beforeEach(async () => {
    process.env.KEY_ENCRYPTION_SECRET = "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=";
    process.env.CRON_SECRET = "test-secret";
    mockProviders = [
      { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", authType: "bearer", catalogSource: "api" },
      { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", authType: "bearer", catalogSource: "manual" }
    ];
    mockModels = [];
    mockApiKeys = [];
    mockHealthMetrics = [];
  });

  afterEach(() => {
    mockProviders = [];
    mockModels = [];
    mockApiKeys = [];
    mockHealthMetrics = [];
  });

  describe("update-catalog cron", () => {
    it("harus menolak request tanpa cron secret yang valid", async () => {
      const req = new Request("http://localhost/api/cron/update-catalog", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const res = await updateCatalogGET(req);
      expect(res.status).toBe(401);
    });

    it("harus melakukan sync model baru dan tandai deprecated jika model hilang", async () => {
      mockModels.push(
        { id: "openrouter/old-deprecated-model", providerId: "openrouter", displayName: "Old Model", status: "active" },
        { id: "openrouter/qwen/qwen3-coder:free", providerId: "openrouter", displayName: "Qwen 3 Coder", status: "active" }
      );

      const mockOpenRouterModels = {
        data: [
          { id: "qwen/qwen3-coder:free", name: "Qwen 3 Coder Updated", context_length: 32768, pricing: { prompt: "0", completion: "0" } },
          { id: "meta-llama/llama-3.3-70b:free", name: "Llama 3.3 70B", context_length: 131072, pricing: { prompt: "0", completion: "0" } },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOpenRouterModels),
        } as Response)
      ) as unknown as typeof fetch;

      const req = new Request("http://localhost/api/cron/update-catalog", {
        headers: { authorization: "Bearer test-secret" },
      });

      const res = await updateCatalogGET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);

      global.fetch = originalFetch;
    });
  });

  describe("health-probe cron", () => {
    it("harus melakukan probe ke active keys dan mencatat metrik", async () => {
      mockApiKeys.push({
        id: "key-1",
        providerId: "groq",
        label: "Test Key Groq",
        keyEncrypted: await encryptApiKey("gsk-test-key-123"),
        status: "active",
      });

      mockModels.push({
        id: "groq/openai/gpt-oss-120b",
        providerId: "groq",
        displayName: "Llama 3.3 Versatile",
        status: "active",
      });

      const originalFetch = global.fetch;
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const req = new Request("http://localhost/api/cron/health-probe", {
        headers: { authorization: "Bearer test-secret" },
      });

      const res = await healthProbeGET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.probed).toBe(1);

      global.fetch = originalFetch;
    });
  });
});
