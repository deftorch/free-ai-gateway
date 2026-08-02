import { z } from "zod";

/**
 * Skema Zod untuk OpenAI Chat Completion Request (/v1/chat/completions)
 */
export const chatCompletionSchema = z.object({
  model: z.string({ required_error: "Field 'model' wajib diisi" }).min(1, "Field 'model' tidak boleh kosong"),
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.any().optional(),
      })
    )
    .min(1, "Field 'messages' wajib memiliki minimal 1 pesan"),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  n: z.number().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().optional(),
  presence_penalty: z.number().optional(),
  frequency_penalty: z.number().optional(),
  user: z.string().optional(),
}).passthrough();

/**
 * Skema Zod untuk Anthropic Messages API Request (/v1/messages)
 */
export const anthropicMessagesSchema = z.object({
  model: z.string({ required_error: "Field 'model' wajib diisi" }).min(1, "Field 'model' tidak boleh kosong"),
  messages: z
    .array(
      z.object({
        role: z.string(),
        content: z.any(),
      })
    )
    .min(1, "Field 'messages' wajib memiliki minimal 1 pesan"),
  max_tokens: z.number().optional(),
  system: z.union([z.string(), z.array(z.any())]).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
}).passthrough();

/**
 * Skema Zod untuk OpenAI Embeddings API Request (/v1/embeddings)
 */
export const embeddingsSchema = z.object({
  model: z.string({ required_error: "Field 'model' wajib diisi" }).min(1, "Field 'model' tidak boleh kosong"),
  input: z.union([z.string(), z.array(z.string()), z.array(z.number()), z.array(z.array(z.number()))], {
    required_error: "Field 'input' wajib diisi",
  }),
  user: z.string().optional(),
  dimensions: z.number().optional(),
}).passthrough();

/**
 * Helper untuk memvalidasi body dengan Zod schema
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Format JSON request tidak valid";
    return { success: false, error: message };
  }
  return { success: true, data: result.data };
}
