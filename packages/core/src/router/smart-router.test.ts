import { describe, it, expect } from "bun:test";
import { classifyTask, resolveModelGroupTargets } from "./smart-router";

describe("Smart Routing & Model Groups Engine", () => {
  describe("classifyTask", () => {
    it("harus mengklasifikasikan request vision jika terdapat image_url atau data:image", () => {
      const task1 = classifyTask([
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "https://example.com/cat.jpg" } }],
        },
      ]);
      expect(task1).toBe("vision");

      const task2 = classifyTask([{ role: "user", content: "Berikut gambar data:image/png;base64,12345" }]);
      expect(task2).toBe("vision");
    });

    it("harus mengklasifikasikan request coding jika terdapat codeblock atau kata kunci pemrograman", () => {
      const task1 = classifyTask([{ role: "user", content: "Tolong perbaiki syntax error ini ```const a = 1;```" }]);
      expect(task1).toBe("coding");

      const task2 = classifyTask([{ role: "user", content: "Bagaimana cara melakukan refactor function di typescript?" }]);
      expect(task2).toBe("coding");
    });

    it("harus mengembalikan 'general' untuk prompt umum biasa", () => {
      const task = classifyTask([{ role: "user", content: "Siapa presiden pertama Indonesia?" }]);
      expect(task).toBe("general");
    });
  });

  describe("resolveModelGroupTargets", () => {
    it("harus meresolve alias 'auto' sesuai hasil klasifikasi tugas", async () => {
      const targetsCoding = await resolveModelGroupTargets("auto", [
        { role: "user", content: "Buatkan function javascript untuk sorting array." },
      ]);
      expect(targetsCoding[0].providerId).toBe("groq");
      expect(["openai/gpt-oss-120b", "openai/gpt-oss-120b"]).toContain(targetsCoding[0].modelId);

      const targetsVision = await resolveModelGroupTargets("auto", [
        { role: "user", content: "Jelaskan isi gambar ini data:image/png;base64,xyz" },
      ]);
      expect(targetsVision[0].providerId).toBe("google-ai-studio");
    });

    it("harus meresolve builtin model group 'kode-terbaik'", async () => {
      const targets = await resolveModelGroupTargets("kode-terbaik");
      expect(targets.length).toBeGreaterThan(1);
      expect(targets[0].providerId).toBe("groq");
    });

    it("harus meresolve model id standar provider/model tunggal", async () => {
      const targets = await resolveModelGroupTargets("groq/openai/gpt-oss-120b");
      expect(targets.length).toBe(1);
      expect(targets[0].providerId).toBe("groq");
      expect(targets[0].modelId).toBe("openai/gpt-oss-120b");
    });
  });
});
