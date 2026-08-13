import * as z from "zod";

/**
 * Validasi request POST /v1/chat/completions.
 *
 * Field `provider` BUKAN bagian dari format OpenAI asli -- ini extension
 * sementara untuk Step 1 (§12.1): sampai Step 9 punya resolver otomatis
 * ("Model/provider resolver" di arsitektur §4), klien wajib bilang provider
 * mana yang dituju secara eksplisit. Nanti field ini jadi OPSIONAL (resolver
 * ambil alih kalau kosong) -- bukan breaking change, evolusi non-destruktif.
 */
export const chatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  provider: z.enum(["gemini", "nvidia-nim"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

export type ChatCompletionRequestBody = z.infer<typeof chatCompletionRequestSchema>;
