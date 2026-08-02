import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { GET as healthGET } from "@/app/internal/health/route";
import { GET as modelsGET, PATCH as modelsPATCH } from "@/app/internal/models/route";
import { GET as tokensGET, POST as tokensPOST, DELETE as tokensDELETE } from "@/app/internal/tokens/route";

mock.module("@free-ai-gateway/database", () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => [],
          catch: () => []
        })
      }),
      insert: () => ({
        values: () => ({
          returning: () => [{
            id: "gw_mock123",
            createdAt: new Date().toISOString()
          }]
        })
      }),
      delete: () => ({
        where: () => ({
          catch: () => {}
        })
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [{ id: "mock-id" }]
          })
        })
      })
    },
    gatewayTokens: { id: "mock-id" },
    models: { id: "mock-id", status: "mock-status" }
  };
});

describe("Dashboard UI & Internal API Integration Suite (Fase E)", () => {
  const adminToken = "admin-secret-token-test";
  const authHeader = `Bearer ${adminToken}`;

  beforeEach(() => {
    process.env.INTERNAL_ADMIN_TOKEN = adminToken;
  });

  afterEach(() => {
    delete process.env.INTERNAL_ADMIN_TOKEN;
  });

  describe("Keamanan Endpoint Internal Admin Dashboard", () => {
    it("harus menolak request /internal/health tanpa token admin valid (401)", async () => {
      const req = new Request("http://localhost/internal/health");
      const res = await healthGET(req);
      expect(res.status).toBe(401);
    });

    it("harus menolak request /internal/models tanpa token admin valid (401)", async () => {
      const req = new Request("http://localhost/internal/models");
      const res = await modelsGET(req);
      expect(res.status).toBe(401);
    });

    it("harus menolak request /internal/tokens tanpa token admin valid (401)", async () => {
      const req = new Request("http://localhost/internal/tokens");
      const res = await tokensGET(req);
      expect(res.status).toBe(401);
    });
  });

  describe("Dashboard Overview Flow (/internal/health)", () => {
    it("harus mengembalikan metrik kesehatan, statistik keys, dan providerCapacity jika diautentikasi admin", async () => {
      const req = new Request("http://localhost/internal/health", {
        headers: { authorization: authHeader },
      });
      const res = await healthGET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.keys)).toBe(true);
      expect(Array.isArray(json.recentMetrics)).toBe(true);
      expect(Array.isArray(json.providerCapacity)).toBe(true);
    });
  });

  describe("Dashboard Model Catalog Management (/internal/models)", () => {
    it("harus mendukung query parameter needsReview=true", async () => {
      const req = new Request("http://localhost/internal/models?needsReview=true", {
        headers: { authorization: authHeader },
      });
      const res = await modelsGET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("harus menolak PATCH /internal/models jika tidak ada field 'id'", async () => {
      const req = new Request("http://localhost/internal/models", {
        method: "PATCH",
        headers: { authorization: authHeader, "content-type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const res = await modelsPATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Field 'id' model wajib ada");
    });
  });

  describe("Dashboard Token Management (/internal/tokens)", () => {
    it("harus dapat membuat gateway token baru dan mengembalikan rawToken", async () => {
      const req = new Request("http://localhost/internal/tokens", {
        method: "POST",
        headers: { authorization: authHeader, "content-type": "application/json" },
        body: JSON.stringify({ projectLabel: "Proyek Test Frontend", storeBody: true }),
      });
      const res = await tokensPOST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.projectLabel).toBe("Proyek Test Frontend");
      expect(json.rawToken).toBeDefined();
      expect(json.rawToken.startsWith("gw_")).toBe(true);
    });

    it("harus menolak POST /internal/tokens jika projectLabel kosong", async () => {
      const req = new Request("http://localhost/internal/tokens", {
        method: "POST",
        headers: { authorization: authHeader, "content-type": "application/json" },
        body: JSON.stringify({ storeBody: true }),
      });
      const res = await tokensPOST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("projectLabel");
    });

    it("harus dapat menghapus/revoke token via DELETE /internal/tokens?id=...", async () => {
      const req = new Request("http://localhost/internal/tokens?id=token-id-123", {
        method: "DELETE",
        headers: { authorization: authHeader },
      });
      const res = await tokensDELETE(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.deleted).toBe("token-id-123");
    });
  });
});
