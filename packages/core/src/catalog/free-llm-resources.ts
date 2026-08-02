/**
 * Helper untuk mem-fetch & mem-parse catalog dari repo GitHub `cheahjs/free-llm-api-resources`.
 * Digunakan oleh cron job `update-catalog` sebagai sinyal pembanding sekunder.
 */

export interface ParsedProviderCatalog {
  providerName: string;
  models: string[];
}

export async function fetchFreeLlmResourcesCatalog(): Promise<ParsedProviderCatalog[]> {
  const url = "https://raw.githubusercontent.com/cheahjs/free-llm-api-resources/main/README.md";

  try {
    const res = await fetch(url);
    if (!res.ok || typeof res.text !== "function") {
      return [];
    }

    const text = await res.text();
    const parsed = parseFreeLlmResourcesMarkdown(text);

    // Fallback parser sekunder (bukan LLM/"agentic" - ini pola regex yang lebih longgar).
    // Jika format markdown berubah cukup drastis sehingga parser utama gagal
    // menangkap section `### Provider`, kita coba pola heading alternatif
    // (bold `**Provider**` atau tabel pipe `| Provider | Model |`) sebelum menyerah.
    // CATATAN JUJUR: ini BUKAN pemanggilan LLM sungguhan. Ekstraksi berbasis LLM
    // nyata memerlukan panggilan `processChatRequest` internal dengan auth yang
    // valid dan belum diimplementasikan di sini - jika suatu saat diimplementasikan,
    // fungsi ini yang harus diganti, bukan dibiarkan berpura-pura sudah agentic.
    if (parsed.length < 3) {
      console.warn(
        "[catalog] Parser markdown utama gagal mengekstrak data yang cukup (%d provider). Mencoba fallback parser sekunder...",
        parsed.length
      );
      const fallbackParsed = parseFreeLlmResourcesLooseFallback(text);
      if (fallbackParsed.length > 0) {
        return fallbackParsed;
      }
      console.warn("[catalog] Fallback parser sekunder juga gagal. Mengembalikan array kosong (bukan data palsu).");
      return [];
    }

    return parsed;
  } catch (err) {
    console.error("[free-llm-resources] Error mem-fetch catalog:", err);
    return [];
  }
}

/**
 * Fallback parser sekunder: menangkap pola heading/tabel alternatif yang tidak
 * dikenali oleh `parseFreeLlmResourcesMarkdown` (mis. `**Provider Name**` sebagai
 * heading bold, atau baris tabel pipe `| Provider | Model A, Model B |`).
 * Selalu mengembalikan data nyata hasil parsing, atau array kosong - tidak pernah
 * data hardcoded/fiktif.
 */
export function parseFreeLlmResourcesLooseFallback(markdownText: string): ParsedProviderCatalog[] {
  const result: ParsedProviderCatalog[] = [];
  const lines = markdownText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Pola: `**Provider Name**` di awal baris sebagai heading bold.
    const boldHeading = trimmed.match(/^\*\*([^*]+)\*\*\s*[:：]?\s*(.*)$/);
    if (boldHeading) {
      const providerName = boldHeading[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      const rest = boldHeading[2] || "";
      const models = rest
        .split(/,|\|/)
        .map((m) => m.trim())
        .filter(Boolean);
      if (providerName && models.length > 0) {
        result.push({ providerName, models });
      }
      continue;
    }

    // Pola: baris tabel pipe `| Provider | Model A, Model B |`
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      // Lewati baris separator tabel seperti `| --- | --- |`
      if (cells.length >= 2 && !cells.every((c) => /^:?-+:?$/.test(c))) {
        const providerName = cells[0].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
        const models = cells
          .slice(1)
          .join(",")
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        if (providerName && providerName.toLowerCase() !== "provider" && models.length > 0) {
          result.push({ providerName, models });
        }
      }
    }
  }

  return result;
}

/**
 * Parsing sederhana berkinerja tinggi untuk Markdown README free-llm-api-resources.
 * Mengekstrak section `### [Provider Name]` atau `### Provider Name` beserta daftar model di dalamnya.
 */
export function parseFreeLlmResourcesMarkdown(markdownText: string): ParsedProviderCatalog[] {
  const result: ParsedProviderCatalog[] = [];
  const lines = markdownText.split("\n");

  let currentProvider: string | null = null;
  let currentModels: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Deteksi heading level 3 `###` (mis. `### [Google AI Studio](url)` atau `### [Groq]`)
    if (trimmed.startsWith("### ")) {
      if (currentProvider && currentModels.length > 0) {
        result.push({ providerName: currentProvider, models: [...currentModels] });
      }

      // Bersihkan Markdown link sintaks: `[Google AI Studio](https://...)` -> `Google AI Studio`
      const rawHeader = trimmed.slice(4).trim();
      const cleanHeader = rawHeader.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();

      currentProvider = cleanHeader;
      currentModels = [];
      continue;
    }

    if (!currentProvider) continue;

    // Deteksi baris tabel (mis. `<tr><td>Gemini 2.5 Flash</td>...</tr>` atau `| Model Name | ... |`)
    if (trimmed.includes("<td>")) {
      const match = trimmed.match(/<td>([^<]+)<\/td>/i);
      if (match && match[1]) {
        const modelName = match[1].trim();
        if (modelName && !currentModels.includes(modelName)) {
          currentModels.push(modelName);
        }
      }
    } else if (trimmed.startsWith("- [")) {
      // Deteksi bullet list (mis. `- [Cohere North Mini Code](url)`)
      const match = trimmed.match(/-\s*\[([^\]]+)\]/);
      if (match && match[1]) {
        const modelName = match[1].trim();
        if (modelName && !currentModels.includes(modelName)) {
          currentModels.push(modelName);
        }
      }
    } else if (trimmed.startsWith("- ")) {
      // Deteksi bullet list biasa (mis. `- Codestral`)
      const modelName = trimmed.slice(2).trim();
      if (modelName && !modelName.startsWith("[") && !currentModels.includes(modelName)) {
        currentModels.push(modelName);
      }
    }
  }

  if (currentProvider && currentModels.length > 0) {
    result.push({ providerName: currentProvider, models: currentModels });
  }

  return result;
}
