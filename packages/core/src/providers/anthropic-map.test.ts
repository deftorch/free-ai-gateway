import { describe, it, expect } from "bun:test";
import {
  translateAnthropicToOpenAI,
  translateOpenAIResponseToAnthropic,
  type AnthropicRequest,
} from "./anthropic-map";

describe("Anthropic to OpenAI Mapper Engine", () => {
  describe("translateAnthropicToOpenAI", () => {
    it("harus menerjemahkan pesan teks dan system prompt dasar dengan benar", () => {
      const anthropicReq: AnthropicRequest = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: "Kamu adalah asisten koding.",
        messages: [
          { role: "user", content: "Halo Claude!" },
          { role: "assistant", content: "Halo! Ada yang bisa saya bantu?" },
          { role: "user", content: "Buatkan saya fizzbuzz." },
        ],
      };

      const openAiReq = translateAnthropicToOpenAI(anthropicReq);

      expect(openAiReq.model).toBe("groq/openai/gpt-oss-120b"); // mapped from claude-*
      expect(openAiReq.messages.length).toBe(4); // 1 system + 3 conversation

      expect(openAiReq.messages[0].role).toBe("system");
      expect(openAiReq.messages[0].content).toBe("Kamu adalah asisten koding.");

      expect(openAiReq.messages[1].role).toBe("user");
      expect(openAiReq.messages[1].content).toBe("Halo Claude!");
    });

    it("harus menerjemahkan tools Anthropic ke functions OpenAI", () => {
      const anthropicReq: AnthropicRequest = {
        model: "groq/openai/gpt-oss-120b",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Berapa suhu di Jakarta?" }],
        tools: [
          {
            name: "get_weather",
            description: "Mendapatkan cuaca",
            input_schema: {
              type: "object",
              properties: {
                location: { type: "string" },
              },
            },
          },
        ],
      };

      const openAiReq = translateAnthropicToOpenAI(anthropicReq);

      expect(openAiReq.tools).toBeDefined();
      expect(openAiReq.tools!.length).toBe(1);
      expect(openAiReq.tools![0].type).toBe("function");
      expect(openAiReq.tools![0].function.name).toBe("get_weather");
    });
  });

  describe("translateOpenAIResponseToAnthropic", () => {
    it("harus menerjemahkan standard OpenAI response ke Anthropic format", () => {
      const openAiRes = {
        id: "chatcmpl-12345",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Halo, ini respon saya.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        },
      };

      const anthropicRes = translateOpenAIResponseToAnthropic(openAiRes, "claude-3-5-sonnet-20241022");

      expect(anthropicRes.id).toBe("chatcmpl-12345");
      expect(anthropicRes.type).toBe("message");
      expect(anthropicRes.role).toBe("assistant");
      expect(anthropicRes.content.length).toBe(1);
      expect(anthropicRes.content[0].type).toBe("text");
      expect(anthropicRes.content[0].text).toBe("Halo, ini respon saya.");
      expect(anthropicRes.stop_reason).toBe("end_turn");
      expect(anthropicRes.usage.input_tokens).toBe(15);
      expect(anthropicRes.usage.output_tokens).toBe(25);
    });

    it("harus menerjemahkan tool calls dari OpenAI ke format tool_use Anthropic", () => {
      const openAiRes = {
        id: "chatcmpl-tool-123",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_abc",
                  type: "function",
                  function: {
                    name: "get_weather",
                    arguments: '{"location":"Jakarta"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
      };

      const anthropicRes = translateOpenAIResponseToAnthropic(openAiRes, "claude-3-5-sonnet-20241022");

      expect(anthropicRes.stop_reason).toBe("tool_use");
      expect(anthropicRes.content.length).toBe(1);
      expect(anthropicRes.content[0].type).toBe("tool_use");
      expect(anthropicRes.content[0].id).toBe("call_abc");
      expect(anthropicRes.content[0].name).toBe("get_weather");
      expect(anthropicRes.content[0].input.location).toBe("Jakarta");
    });
  });
});
