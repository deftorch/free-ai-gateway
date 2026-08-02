import { describe, it, expect } from "bun:test";
import { POST } from "./route";

describe("Internal Chaos Outage Simulator Route Handler (/internal/chaos)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/chaos", {
      method: "POST",
      body: JSON.stringify({ providerId: "groq", action: "enable" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("harus menolak request yang tidak memiliki field providerId (400)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/chaos", {
      method: "POST",
      headers: {
        Authorization: "Bearer secret-admin-key",
      },
      body: JSON.stringify({ action: "enable" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("harus berhasil memproses permintaan enable/disable chaos outage dengan token valid", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";

    const kvModule = await import("@free-ai-gateway/core");
    const originalGet = kvModule.kv.get;
    const originalSet = kvModule.kv.set;
    const originalDel = kvModule.kv.del;

    kvModule.kv.get = (() => Promise.resolve(false)) as unknown as typeof kvModule.kv.get;
    kvModule.kv.set = (() => Promise.resolve("OK")) as unknown as typeof kvModule.kv.set;
    kvModule.kv.del = (() => Promise.resolve(1)) as unknown as typeof kvModule.kv.del;

    const req = new Request("http://localhost/internal/chaos", {
      method: "POST",
      headers: {
        Authorization: "Bearer secret-admin-key",
      },
      body: JSON.stringify({ providerId: "groq", action: "enable" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.providerId).toBe("groq");
    expect(json.simulatedOutage).toBe(true);

    kvModule.kv.get = originalGet;
    kvModule.kv.set = originalSet;
    kvModule.kv.del = originalDel;
  });
});
