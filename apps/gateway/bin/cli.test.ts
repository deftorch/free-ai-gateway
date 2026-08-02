import { describe, it, expect } from "bun:test";
import path from "node:path";

describe("CLI Tool Script (bin/cli.ts)", () => {
  it("harus mencetak petunjuk penggunaan jika dipanggil dengan --help", async () => {
    // Path absolut dari lokasi file test ini, bukan relatif terhadap cwd —
    // sebelumnya gagal karena `apps/gateway/bin/cli.ts` diasumsikan relatif
    // terhadap root monorepo, padahal `bun test` dijalankan dengan cwd yang
    // sudah di dalam apps/gateway (jadi path-nya dobel & tidak ditemukan).
    const cliPath = path.join(import.meta.dir, "cli.ts");
    const proc = Bun.spawn(["bun", cliPath, "--help"], {
      stdout: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    expect(output).toContain("FREE AI GATEWAY CLI TOOL");
    expect(output).toContain("tokens create");
    expect(output).toContain("keys add");
  });
});
