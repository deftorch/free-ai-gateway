/**
 * Anthropic to OpenAI Mapping Engine (`lib/providers/anthropic-map.ts`)
 *
 * Menerjemahkan format request dan response (baik non-streaming maupun streaming SSE)
 * dari Anthropic Messages API (`POST /v1/messages`) ke format OpenAI Chat Completions API,
 * sehingga gateway dapat digunakan secara native oleh Claude Code CLI, Anthropic SDK,
 * dan alat lain yang mendukung protokol Anthropic.
 */

import type { ChatCompletionRequest, ChatMessage } from "./types";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; source?: any }>;
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: string; text: string }>;
  max_tokens: number;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  tools?: Array<{
    name: string;
    description?: string;
    input_schema?: Record<string, any>;
  }>;
  [key: string]: any;
}

/**
 * Menerjemahkan request body Anthropic (`/v1/messages`) menjadi OpenAI Chat Completion request.
 */
export function translateAnthropicToOpenAI(anthropicBody: AnthropicRequest): ChatCompletionRequest {
  const messages: ChatMessage[] = [];

  // 1. Tangani system prompt jika ada di Anthropic format
  if (anthropicBody.system) {
    if (typeof anthropicBody.system === "string") {
      messages.push({ role: "system", content: anthropicBody.system });
    } else if (Array.isArray(anthropicBody.system)) {
      const combined = anthropicBody.system
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n");
      if (combined) {
        messages.push({ role: "system", content: combined });
      }
    }
  }

  // 2. Menerjemahkan messages array
  for (const msg of anthropicBody.messages) {
    let contentStr = "";
    if (typeof msg.content === "string") {
      contentStr = msg.content;
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          contentStr += part.text;
        } else if (part.type === "image" && part.source) {
          // Dukungan Vision base64 image data URL
          const src = part.source;
          if (src.type === "base64" && src.data) {
            contentStr += `\n[Image: data:${src.media_type};base64,${src.data}]`;
          }
        }
      }
    }
    messages.push({
      role: msg.role,
      content: contentStr,
    });
  }

  // 3. Menerjemahkan tools (jika ada) ke format OpenAI functions/tools
  let tools: any[] | undefined = undefined;
  if (Array.isArray(anthropicBody.tools) && anthropicBody.tools.length > 0) {
    tools = anthropicBody.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || "",
        parameters: t.input_schema || { type: "object", properties: {} },
      },
    }));
  }

  // 4. Petakan nama model anthropic (mis. claude-3-5-sonnet-*) ke model default gateway (mis. groq/openai/gpt-oss-120b atau openrouter)
  // User atau Claude Code biasanya mengirim model anthropic, kita bisa map atau biarkan diteruskan.
  let targetModel = anthropicBody.model;
  if (targetModel.includes("claude")) {
    // Default fallback mapping untuk Claude Code ke model open/gratis yang mumpuni di gateway.
    // Sebelumnya "groq/openai/gpt-oss-120b" (deprecated per 17 Juni 2026,
    // lihat dokumentasi §11.2) — diganti ke model pengganti resmi yang sama
    // dipakai di packages/core/src/router/smart-router.ts.
    targetModel = "groq/openai/gpt-oss-120b";
  }

  return {
    model: targetModel,
    messages,
    max_tokens: anthropicBody.max_tokens || 4096,
    stream: !!anthropicBody.stream,
    temperature: anthropicBody.temperature,
    top_p: anthropicBody.top_p,
    stop: anthropicBody.stop_sequences,
    tools,
  };
}

/**
 * Menerjemahkan response non-streaming OpenAI ke Anthropic Messages response format.
 */
export function translateOpenAIResponseToAnthropic(openAiRes: any, originalModel: string): any {
  const choice = openAiRes.choices?.[0];
  const message = choice?.message || {};
  const contentText = message.content || "";

  const contentBlocks: any[] = [];
  if (contentText) {
    contentBlocks.push({
      type: "text",
      text: contentText,
    });
  }

  // Jika ada tool calls dari OpenAI, petakan ke tool_use Anthropic
  if (Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      let argsObj = {};
      try {
        argsObj = JSON.parse(tc.function.arguments || "{}");
      } catch {
        argsObj = {};
      }
      contentBlocks.push({
        type: "tool_use",
        id: tc.id || `toolu_${Math.random().toString(36).substring(2, 10)}`,
        name: tc.function.name,
        input: argsObj,
      });
    }
  }

  const stopReasonMap: Record<string, string> = {
    stop: "end_turn",
    length: "max_tokens",
    tool_calls: "tool_use",
  };

  return {
    id: openAiRes.id || `msg_${Math.random().toString(36).substring(2, 12)}`,
    type: "message",
    role: "assistant",
    content: contentBlocks,
    model: originalModel,
    stop_reason: stopReasonMap[choice?.finish_reason] || "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: openAiRes.usage?.prompt_tokens || 10,
      output_tokens: openAiRes.usage?.completion_tokens || 10,
    },
  };
}
