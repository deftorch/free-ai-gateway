import { routeChatCompletion, resolveModelGroupTargets } from "@free-ai-gateway/core";
import { checkIpRateLimit } from "@free-ai-gateway/core";

export const runtime = "nodejs";
export const maxDuration = 60;

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatRequest {
  model?: string;
  messages?: OllamaMessage[];
  stream?: boolean;
}

export async function POST(req: Request) {
  const start = Date.now();

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const rateLimit = await checkIpRateLimit(ip);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too Many Requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetSeconds),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }

  let body: OllamaChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.model || !body?.messages || !Array.isArray(body.messages)) {
    return Response.json({ error: "Field 'model' dan 'messages' (array) wajib ada." }, { status: 400 });
  }

  const model = body.model;
  const isStream = body.stream !== false; // Ollama default is stream = true

  const targets = await resolveModelGroupTargets(model, body.messages);

  const { response: upstreamRes, usedTarget } = await routeChatCompletion(
    targets,
    {
      model,
      messages: body.messages,
      stream: isStream,
    }
  );

  if (!upstreamRes.ok) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: upstreamRes.headers,
    });
  }

  const selectedModel = usedTarget
    ? `${usedTarget.providerId}/${usedTarget.modelId}`
    : model;

  // Non-streaming response translation
  if (!isStream) {
    const json = await upstreamRes.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content || "";

    return Response.json({
      model: selectedModel,
      created_at: new Date().toISOString(),
      message: {
        role: "assistant",
        content,
      },
      done: true,
      total_duration: (Date.now() - start) * 1000000, // nanoseconds
      load_duration: 1000000,
      prompt_eval_count: json?.usage?.prompt_tokens || 0,
      eval_count: json?.usage?.completion_tokens || 0,
    });
  }

  // Streaming response translation: SSE (data: {...}) -> NDJSON
  const reader = upstreamRes.body?.getReader();
  if (!reader) {
    return Response.json({ error: "Failed to read upstream stream" }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === "[DONE]") {
                const endChunk = JSON.stringify({
                  model: selectedModel,
                  created_at: new Date().toISOString(),
                  message: { role: "assistant", content: "" },
                  done: true,
                  total_duration: (Date.now() - start) * 1000000,
                }) + "\n";
                controller.enqueue(encoder.encode(endChunk));
                continue;
              }

              try {
                const parsed = JSON.parse(dataStr);
                const deltaContent = parsed?.choices?.[0]?.delta?.content;

                if (deltaContent) {
                  const chunk = JSON.stringify({
                    model: selectedModel,
                    created_at: new Date().toISOString(),
                    message: { role: "assistant", content: deltaContent },
                    done: false,
                  }) + "\n";
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch {
                // Ignore parse errors on partial lines
              }
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
