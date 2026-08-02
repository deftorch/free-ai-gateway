import { describe, it, expect } from "bun:test";
import {
  sanitizeLoneSurrogates,
  rescueToolCallsFromText,
  simulateSystemRole,
} from "./quirks";

describe("Provider Quirks & Rescue Engine", () => {
  describe("sanitizeLoneSurrogates", () => {
    it("harus membersihkan lone high surrogate", () => {
      const badString = "Halo \uD800 Dunia";
      const sanitized = sanitizeLoneSurrogates(badString);
      // toWellFormed() standard menggantinya dengan unicode replacement character (U+FFFD - "")
      expect(sanitized).toBe("Halo � Dunia");
    });

    it("harus membiarkan surrogate pair yang valid (emoji) tetap utuh", () => {
      const goodString = "Halo 🔥 Dunia";
      const sanitized = sanitizeLoneSurrogates(goodString);
      expect(sanitized).toBe(goodString);
    });
  });

  describe("rescueToolCallsFromText", () => {
    it("harus mengekstrak tool call yang dibungkus plain text secara manual", () => {
      const plainTextWithJson = `Tentu, saya akan memanggil fungsi ini untuk Anda:
      {
        "name": "get_weather",
        "arguments": {
          "location": "Jakarta",
          "unit": "celsius"
        }
      }
      Semoga membantu!`;

      const rescued = rescueToolCallsFromText(plainTextWithJson);
      expect(rescued).not.toBeNull();
      expect(rescued!.length).toBe(1);
      expect(rescued![0].function.name).toBe("get_weather");

      const args = JSON.parse(rescued![0].function.arguments);
      expect(args.location).toBe("Jakarta");
    });

    it("harus mengembalikan null jika tidak ada format mirip function call", () => {
      const plainText = "Ini hanya teks biasa tanpa JSON apa pun.";
      const rescued = rescueToolCallsFromText(plainText);
      expect(rescued).toBeNull();
    });
  });

  describe("simulateSystemRole", () => {
    it("harus menggabungkan system prompt ke dalam user message pertama jika ada", () => {
      const messages = [
        { role: "system", content: "Kamu adalah asisten koding." },
        { role: "user", content: "Halo, buatkan saya fungsi fizzbuzz." },
      ];

      const simulated = simulateSystemRole(messages);
      expect(simulated.length).toBe(1);
      expect(simulated[0].role).toBe("user");
      expect(simulated[0].content).toContain("[System Instruction]");
      expect(simulated[0].content).toContain("Kamu adalah asisten koding.");
      expect(simulated[0].content).toContain("Halo, buatkan saya fungsi fizzbuzz.");
    });

    it("harus membuat user message baru jika tidak ada user message sama sekali", () => {
      const messages = [
        { role: "system", content: "Sistem prompt saja." },
      ];

      const simulated = simulateSystemRole(messages);
      expect(simulated.length).toBe(1);
      expect(simulated[0].role).toBe("user");
      expect(simulated[0].content).toContain("Sistem prompt saja.");
    });
  });
});
