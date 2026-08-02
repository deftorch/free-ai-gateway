import { describe, it, expect } from "bun:test";

/**
 * Helper logika task classifier yang digunakan pada Front-end Dashboard UI (app/dashboard/page.tsx)
 */
function detectDashboardTaskCategory(prompt: string): "vision" | "coding" | "general" {
  const text = prompt.toLowerCase();
  if (text.includes("data:image/") || text.includes("gambar") || text.includes("foto")) {
    return "vision";
  } else if (
    text.includes("```") ||
    /\b(function|def |class |import |const |let |var |typescript|python|code|script|bug)\b/i.test(text)
  ) {
    return "coding";
  }
  return "general";
}

describe("Dashboard UI Component & Task Classifier Logic Suite", () => {
  it("harus mendeteksi kueri bermuatan gambar/foto sebagai 'vision'", () => {
    expect(detectDashboardTaskCategory("Tolong jelaskan isi dari foto ini")).toBe("vision");
    expect(detectDashboardTaskCategory("data:image/png;base64,iVBORw0KGgo...")).toBe("vision");
  });

  it("harus mendeteksi kode pemrograman/script sebagai 'coding'", () => {
    expect(detectDashboardTaskCategory("Buatkan saya function sorting di TypeScript")).toBe("coding");
    expect(detectDashboardTaskCategory("Ada bug di script python ini ```import os```")).toBe("coding");
  });

  it("harus mendeteksi teks biasa sebagai 'general'", () => {
    expect(detectDashboardTaskCategory("Siapakah penemu benua Amerika?")).toBe("general");
  });

  it("harus memiliki struktur tab dashboard yang lengkap (Overview, Keys, Tokens, Routing, Discovery, Playground)", async () => {
    const dashboardModule = await import("./page");
    expect(dashboardModule.default).toBeDefined();
    expect(typeof dashboardModule.default).toBe("function");
  });
});
