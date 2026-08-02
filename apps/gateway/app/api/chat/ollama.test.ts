import { describe, it, expect } from "bun:test";
import { GET as getTags } from "../tags/route";
import { POST as postChat } from "./route";

describe("Ollama Native Emulation Routes (/api/tags & /api/chat)", () => {
  it("GET /api/tags harus mengembalikan daftar model berformat Ollama yang valid", async () => {
    const req = new Request("http://localhost:3000/api/tags");
    const res = await getTags(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.models)).toBe(true);
    expect(json.models.length).toBeGreaterThan(0);

    const autoModel = json.models.find((m: { name: string }) => m.name === "auto");
    expect(autoModel).toBeDefined();
    expect(autoModel.details).toBeDefined();
    expect(autoModel.details.family).toBeDefined();
  });

  it("POST /api/chat harus memvalidasi field 'model' dan 'messages' (400)", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({ model: "auto" }),
    });

    const res = await postChat(req);
    expect(res.status).toBe(400);
  });
});
