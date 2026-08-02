import { eq, arrayContains } from "drizzle-orm";
import { db } from "@free-ai-gateway/database";
import { modelGroups, models } from "@free-ai-gateway/database";
import { parseModelId, type RouteTarget } from "./index";

export type TaskType = "coding" | "vision" | "general";

/**
 * Rule-based task classifier (bagian 5.4 dokumen desain).
 * Mengklasifikasikan tipe request berdasarkan isi pesan prompt secara instan tanpa menambah latensi.
 */
export function classifyTask(messages?: Array<{ role: string; content: unknown }>): TaskType {
  if (!messages || messages.length === 0) return "general";

  for (const msg of messages) {
    // 1. Vision Check: array content dengan type "image_url" atau string berisi data:image
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (typeof part === "object" && part !== null && "type" in part) {
          const p = part as { type?: string };
          if (p.type === "image_url" || p.type === "image") return "vision";
        }
      }
    } else if (typeof msg.content === "string") {
      if (msg.content.includes("data:image/")) return "vision";

      // 2. Coding Check: markdown codeblocks atau kata kunci pemrograman
      const text = msg.content;
      if (text.includes("```")) return "coding";
      if (
        /\b(function|def |class |import |const |let |var |return |bug|refactor|syntax|typescript|python|golang|javascript|rust|html|css)\b/i.test(
          text
        )
      ) {
        return "coding";
      }
    }
  }

  return "general";
}

/**
 * Builtin fallback model groups (snapshot model aktif per Agustus 2026).
 * `groq/openai/gpt-oss-120b` di-deprecate Groq per 17 Juni 2026 — diganti
 * `groq/openai/gpt-oss-120b` (utama) dan `groq/qwen/qwen3.6-27b` (fallback
 * kedua, untuk diversifikasi dari model utama), sesuai rekomendasi resmi
 * Groq (https://console.groq.com/docs/deprecations).
 */
const BUILTIN_MODEL_GROUPS: Record<string, string[]> = {
  "kode-terbaik": ["groq/openai/gpt-oss-120b", "groq/qwen/qwen3.6-27b"],
  "fastest-first": ["groq/openai/gpt-oss-120b", "google-ai-studio/gemini-3.6-flash"],
  fast: ["groq/openai/gpt-oss-120b", "google-ai-studio/gemini-3.6-flash"],
  "best-coding": ["groq/openai/gpt-oss-120b", "groq/qwen/qwen3.6-27b"],
};

/** Builtin fallback untuk rute 'auto' berbasis tugas */
const BUILTIN_TASK_TARGETS: Record<TaskType, string[]> = {
  vision: ["google-ai-studio/gemini-3.6-flash", "google-ai-studio/gemini-3.5-flash"],
  coding: ["groq/openai/gpt-oss-120b", "groq/qwen/qwen3.6-27b"],
  general: ["groq/openai/gpt-oss-120b", "google-ai-studio/gemini-3.6-flash"],
};

import { kv, kvKeys } from "../kv/client";

/**
 * Resolves alias model ("auto", "kode-terbaik", atau nama model group DB)
 * menjadi daftar kandidat RouteTarget dengan urutan prioritas.
 */
export async function resolveModelGroupTargets(
  modelAlias: string,
  messages?: Array<{ role: string; content: unknown }>
): Promise<RouteTarget[]> {
  // 0. Canary Traffic Splitting Check (A/B testing)
  try {
    const canaryRule = await kv.get<{
      mainModel: string;
      canaryModel: string;
      canaryWeight: number;
    }>(kvKeys.canaryRule(modelAlias)).catch(() => null);

    if (canaryRule && canaryRule.mainModel && canaryRule.canaryModel) {
      const roll = Math.floor(Math.random() * 100) + 1;
      if (roll <= canaryRule.canaryWeight) {
        return [parseModelId(canaryRule.canaryModel), parseModelId(canaryRule.mainModel)];
      } else {
        return [parseModelId(canaryRule.mainModel), parseModelId(canaryRule.canaryModel)];
      }
    }
  } catch {
    // Abaikan jika KV check error
  }

  // 1. Kasus "auto" (Smart Routing berbasis tugas)
  if (modelAlias === "auto") {
    const task = classifyTask(messages);

    // Coba cari model aktif dari DB dengan tag sesuai task
    try {
      const activeDbModels = await db
        .select()
        .from(models)
        .where(eq(models.status, "active"))
        .catch(() => []);

      const matching = activeDbModels.filter(
        (m: any) => Array.isArray(m.tags) && m.tags.includes(task)
      );

      if (matching.length > 0) {
        return matching.slice(0, 3).map((m: any) => parseModelId(m.id));
      }
    } catch {
      // Abaikan jika DB query gagal
    }

    return BUILTIN_TASK_TARGETS[task].map((m) => parseModelId(m));
  }

  // 2. Cari di DB `model_groups`
  try {
    const [group] = await db
      .select()
      .from(modelGroups)
      .where(eq(modelGroups.id, modelAlias))
      .limit(1)
      .catch(() => []);

    if (group && Array.isArray(group.members) && group.members.length > 0) {
      const sortedMembers = [...group.members];

      if (group.strategy === "load-balance") {
        // Weighted random selection: elemen dengan weight lebih besar memiliki probabilitas lebih tinggi di posisi atas
        sortedMembers.sort((a, b) => {
          const wA = (a.weight ?? 1) * Math.random();
          const wB = (b.weight ?? 1) * Math.random();
          return wB - wA;
        });
      } else {
        // 'ordered' atau 'fastest-first': urutkan berdasarkan priority (terkecil dulu)
        sortedMembers.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      }

      const targets: RouteTarget[] = [];
      for (const member of sortedMembers) {
        try {
          targets.push(parseModelId(member.modelId));
        } catch {
          // Abaikan jika format member.modelId tidak valid
        }
      }
      if (targets.length > 0) return targets;
    }
  } catch {
    // Fallback jika query DB error
  }

  // 3. Cari di Builtin Model Groups
  if (BUILTIN_MODEL_GROUPS[modelAlias]) {
    return BUILTIN_MODEL_GROUPS[modelAlias].map((m) => parseModelId(m));
  }

  // 4. Standar provider/model tunggal
  return [parseModelId(modelAlias)];
}

