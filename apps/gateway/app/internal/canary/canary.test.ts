import { describe, it, expect } from "bun:test";
import { GET, POST, DELETE } from "./route";

describe("Internal Canary Routing Route Handler (/internal/canary)", () => {
  it("harus menolak request tanpa Admin Auth Token (401)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/canary");

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("harus menolak POST jika parameter kurang (400)", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";
    const req = new Request("http://localhost/internal/canary", {
      method: "POST",
      headers: { Authorization: "Bearer secret-admin-key" },
      body: JSON.stringify({ groupName: "kode-terbaik" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("harus berhasil menyimpan dan menghapus aturan canary", async () => {
    process.env.INTERNAL_ADMIN_TOKEN = "secret-admin-key";

    // POST
    const postReq = new Request("http://localhost/internal/canary", {
      method: "POST",
      headers: { Authorization: "Bearer secret-admin-key" },
      body: JSON.stringify({
        groupName: "kode-terbaik",
        mainModel: "groq/openai/gpt-oss-120b",
        canaryModel: "sambanova/Meta-Llama-3.1-405B-Instruct",
        canaryWeight: 20,
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    // DELETE
    const delReq = new Request("http://localhost/internal/canary?groupName=kode-terbaik", {
      method: "DELETE",
      headers: { Authorization: "Bearer secret-admin-key" },
    });

    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(200);
  });
});
