import { describe, it, expect } from "bun:test";
import { GET, POST } from "./route";

describe("Native Model Context Protocol (MCP) Server Endpoint (/api/mcp)", () => {
  it("GET /api/mcp harus mengembalikan status info server MCP", async () => {
    const req = new Request("http://localhost:3000/api/mcp");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.server).toContain("Free AI Gateway MCP Server");
    expect(json.protocolVersion).toBe("2024-11-05");
    expect(json.toolsCount).toBe(7);
  });

  it("POST /api/mcp method 'initialize' harus merespons handshake MCP JSON-RPC 2.0", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jsonrpc).toBe("2.0");
    expect(json.id).toBe(1);
    expect(json.result.protocolVersion).toBe("2024-11-05");
    expect(json.result.serverInfo.name).toBe("free-ai-gateway-mcp-server");
  });

  it("POST /api/mcp method 'tools/list' harus mengembalikan daftar 7 MCP tools", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.tools).toBeDefined();
    expect(Array.isArray(json.result.tools)).toBe(true);
    expect(json.result.tools.length).toBe(7);

    const toolNames = json.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain("list_available_models");
    expect(toolNames).toContain("check_quota");
    expect(toolNames).toContain("send_completion");
    expect(toolNames).toContain("get_gateway_health");
    expect(toolNames).toContain("get_model_leaderboard");
    expect(toolNames).toContain("classify_prompt_task");
    expect(toolNames).toContain("discover_local_models");
  });

  it("POST /api/mcp tools/call 'classify_prompt_task' harus merespons klasifikasi tugas yang valid", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "classify_prompt_task",
          arguments: {
            prompt: "```js\nfunction binarySearch(arr, target) { return -1; }\n```",
          },
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.content).toBeDefined();
    const contentText = json.result.content[0].text;
    expect(contentText).toContain("coding");
  });

  it("POST /api/mcp tools/call 'get_gateway_health' harus mengembalikan status kesehatan", async () => {
    const req = new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "get_gateway_health",
        },
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    const contentText = json.result.content[0].text;
    expect(contentText).toContain("healthy");
  });
});
