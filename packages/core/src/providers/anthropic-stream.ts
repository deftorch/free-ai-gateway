/**
 * Anthropic SSE Stream Transformer Helper
 * Mengubah OpenAI SSE Stream (`data: {...}`) menjadi Anthropic SSE Messages Event Stream
 * (`message_start`, `content_block_start`, `content_block_delta`, `message_delta`, `message_stop`).
 */
export function createAnthropicStreamTransformer(targetModel: string): TransformStream<Uint8Array, Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new TransformStream({
    start(controller) {
      // 1. Kirim event message_start
      const messageStart = {
        type: "message_start",
        message: {
          id: `msg_${Date.now()}`,
          type: "message",
          role: "assistant",
          model: targetModel,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 1 },
        },
      };
      controller.enqueue(encoder.encode(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`));

      // 2. Kirim event content_block_start
      const contentBlockStart = {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      };
      controller.enqueue(encoder.encode(`event: content_block_start\ndata: ${JSON.stringify(contentBlockStart)}\n\n`));
    },

    async transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      let lineEndIdx;
      while ((lineEndIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.substring(0, lineEndIdx).trim();
        buffer = buffer.substring(lineEndIdx + 1);

        if (!line.startsWith("data:")) continue;
        const dataStr = line.slice(5).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(dataStr);
          const deltaText = parsed.choices?.[0]?.delta?.content || "";
          if (deltaText) {
            const contentBlockDelta = {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: deltaText },
            };
            controller.enqueue(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(contentBlockDelta)}\n\n`));
          }
        } catch {
          // Abaikan parsing error untuk baris parsial/tidak lengkap
        }
      }
    },

    async flush(controller) {
      if (buffer.trim()) {
        const line = buffer.trim();
        if (line.startsWith("data:") && !line.includes("[DONE]")) {
          try {
            const parsed = JSON.parse(line.slice(5).trim());
            const deltaText = parsed.choices?.[0]?.delta?.content || "";
            if (deltaText) {
              const contentBlockDelta = {
                type: "content_block_delta",
                index: 0,
                delta: { type: "text_delta", text: deltaText },
              };
              controller.enqueue(encoder.encode(`event: content_block_delta\ndata: ${JSON.stringify(contentBlockDelta)}\n\n`));
            }
          } catch {
            // Abaikan
          }
        }
      }

      // 3. Kirim event content_block_stop
      const contentBlockStop = {
        type: "content_block_stop",
        index: 0,
      };
      controller.enqueue(encoder.encode(`event: content_block_stop\ndata: ${JSON.stringify(contentBlockStop)}\n\n`));

      // 4. Kirim event message_delta
      const messageDelta = {
        type: "message_delta",
        delta: { stop_reason: "end_turn", stop_sequence: null },
        usage: { output_tokens: 50 },
      };
      controller.enqueue(encoder.encode(`event: message_delta\ndata: ${JSON.stringify(messageDelta)}\n\n`));

      // 5. Kirim event message_stop
      const messageStop = {
        type: "message_stop",
      };
      controller.enqueue(encoder.encode(`event: message_stop\ndata: ${JSON.stringify(messageStop)}\n\n`));
    },
  });
}
