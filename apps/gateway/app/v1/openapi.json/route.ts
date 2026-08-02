import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}/v1`;

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Free AI Gateway API",
      version: "1.3.0",
      description:
        "Unified OpenAI & Anthropic-compatible High-Performance AI Gateway with multi-provider API key rotation, auto-failover, smart task classification, and multi-tenant quota management.",
      contact: {
        name: "Free AI Gateway Team",
        url: "https://github.com/deftorch/free-ai-gateway",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: "Free AI Gateway API Endpoint Base Server",
      },
      {
        url: `${url.protocol}//${url.host}`,
        description: "Root Base Server",
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths: {
      "/chat/completions": {
        post: {
          summary: "Create Chat Completion (OpenAI Compatible)",
          description:
            "Executes a chat completion request using specified model or virtual model group (e.g., 'auto', 'kode-terbaik', 'groq/openai/gpt-oss-120b'). Automatically handles key rotation, rate limiting, and failover.",
          operationId: "createChatCompletion",
          tags: ["Chat Completions"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatCompletionRequest",
                },
                example: {
                  model: "auto",
                  messages: [
                    { role: "system", content: "You are a helpful coding assistant." },
                    { role: "user", content: "Write a quicksort function in TypeScript." },
                  ],
                  temperature: 0.7,
                  stream: false,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful Chat Completion Response",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ChatCompletionResponse",
                  },
                },
              },
            },
            "400": {
              description: "Bad Request - Invalid payload or missing model/messages",
            },
            "401": {
              description: "Unauthorized - Invalid or missing Gateway Token",
            },
            "429": {
              description: "Rate Limit / Quota Exceeded",
            },
            "502": {
              description: "Bad Gateway - All candidate provider keys failed",
            },
          },
        },
      },
      "/v1/chat/completions": {
        post: {
          summary: "Create Chat Completion (Full Path)",
          description: "Alias endpoint for /chat/completions",
          tags: ["Chat Completions"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChatCompletionRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Successful Chat Completion Response" },
          },
        },
      },
      "/messages": {
        post: {
          summary: "Create Message (Anthropic Native Compatible)",
          description:
            "Executes an Anthropic-compatible message request. Converts Anthropic request format to OpenAI target format under the hood, enabling seamless integration with tools like Claude Code CLI.",
          operationId: "createAnthropicMessage",
          tags: ["Anthropic Native"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AnthropicMessageRequest",
                },
                example: {
                  model: "claude-3-5-sonnet-20241022",
                  messages: [{ role: "user", content: "Hello from Claude CLI!" }],
                  max_tokens: 1024,
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful Anthropic Message Response",
            },
            "401": {
              description: "Unauthorized",
            },
          },
        },
      },
      "/models": {
        get: {
          summary: "List Models",
          description:
            "Returns a list of all active free models, custom local models, and virtual model groups supported by the gateway.",
          operationId: "listModels",
          tags: ["Models"],
          responses: {
            "200": {
              description: "List of available models",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "list" },
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ModelObject",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/models/{model}": {
        get: {
          summary: "Retrieve Model Metadata",
          description: "Gets detailed information about a specific model by ID.",
          operationId: "retrieveModel",
          tags: ["Models"],
          parameters: [
            {
              name: "model",
              in: "path",
              required: true,
              description: "The ID of the model to retrieve (e.g. 'auto' or 'groq/openai/gpt-oss-120b')",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Model metadata object",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ModelObject",
                  },
                },
              },
            },
            "404": {
              description: "Model not found",
            },
          },
        },
      },
      "/embeddings": {
        post: {
          summary: "Create Embeddings (OpenAI Compatible)",
          description: "Generates text embeddings using supported embedding models.",
          operationId: "createEmbedding",
          tags: ["Embeddings"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["input"],
                  properties: {
                    model: { type: "string", example: "text-embedding-3-small" },
                    input: {
                      oneOf: [
                        { type: "string", example: "The quick brown fox" },
                        { type: "array", items: { type: "string" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Vector embedding object response",
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Gateway Token (gw_...)",
          description: "Provide your Gateway Token created in the Dashboard UI.",
        },
      },
      schemas: {
        ChatCompletionRequest: {
          type: "object",
          required: ["messages"],
          properties: {
            model: {
              type: "string",
              default: "auto",
              description:
                "Model identifier or virtual alias ('auto', 'kode-terbaik', 'fastest-first', or provider/model_id).",
            },
            messages: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ChatMessage",
              },
              description: "List of conversation messages.",
            },
            temperature: {
              type: "number",
              minimum: 0,
              maximum: 2,
              default: 0.7,
              description: "Sampling temperature.",
            },
            top_p: {
              type: "number",
              minimum: 0,
              maximum: 1,
              default: 1,
            },
            stream: {
              type: "boolean",
              default: false,
              description: "Whether to stream back partial progress via Server-Sent Events (SSE).",
            },
            max_tokens: {
              type: "integer",
              description: "Maximum number of tokens to generate.",
            },
            tools: {
              type: "array",
              items: {
                type: "object",
              },
              description: "List of function tools available to the assistant.",
            },
          },
        },
        ChatMessage: {
          type: "object",
          required: ["role", "content"],
          properties: {
            role: {
              type: "string",
              enum: ["system", "user", "assistant", "tool"],
            },
            content: {
              oneOf: [
                { type: "string" },
                {
                  type: "array",
                  items: {
                    type: "object",
                  },
                },
              ],
            },
          },
        },
        ChatCompletionResponse: {
          type: "object",
          properties: {
            id: { type: "string", example: "chatcmpl-9x8y7z" },
            object: { type: "string", example: "chat.completion" },
            created: { type: "integer", example: 1770000000 },
            model: { type: "string", example: "groq/openai/gpt-oss-120b" },
            choices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", example: 0 },
                  message: { $ref: "#/components/schemas/ChatMessage" },
                  finish_reason: { type: "string", example: "stop" },
                },
              },
            },
            usage: {
              type: "object",
              properties: {
                prompt_tokens: { type: "integer", example: 25 },
                completion_tokens: { type: "integer", example: 80 },
                total_tokens: { type: "integer", example: 105 },
              },
            },
          },
        },
        AnthropicMessageRequest: {
          type: "object",
          required: ["messages"],
          properties: {
            model: { type: "string", example: "claude-3-5-sonnet-20241022" },
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" },
                },
              },
            },
            max_tokens: { type: "integer", example: 1024 },
            system: { type: "string" },
          },
        },
        ModelObject: {
          type: "object",
          properties: {
            id: { type: "string", example: "groq/openai/gpt-oss-120b" },
            object: { type: "string", example: "model" },
            created: { type: "integer", example: 1770000000 },
            owned_by: { type: "string", example: "free-ai-gateway" },
            supports_vision: { type: "boolean", example: false },
            supports_coding: { type: "boolean", example: true },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
