/**
 * Provider Quirks & Rescue Engine
 *
 * Menangani berbagai anomali (quirks) perilaku dari bermacam-macam provider AI gratis,
 * seperti:
 * 1. Pembersihan Lone Surrogates (karakter unicode setengah yang bisa merusak request JSON).
 * 2. Rescue Tool Call: Jika provider gratisan mengembalikan JSON tool call yang tidak valid
 *    atau berantakan di dalam text response, kita coba ekstrak secara manual.
 * 3. System Role Simulator: Jika provider tidak mendukung role "system" (misal memicu error 400),
 *    kita gabungkan pesan system tersebut ke pesan user pertama.
 */

/**
 * Memotong lone surrogates agar tidak merusak payload JSON ke provider.
 * Beberapa provider/parser JSON langsung 400 Bad Request jika mendeteksi lone surrogate
 * di astral-plane unicode (seperti emoji yang terpotong).
 */
export function sanitizeLoneSurrogates(text: string): string {
  if (!text) return "";
  // String.prototype.toWellFormed() (tersedia di ES2024 / Node 20+)
  // membersihkan lone surrogates dengan menggantinya dengan unicode replacement character (U+FFFD).
  if (typeof (text as any).toWellFormed === "function") {
    return (text as any).toWellFormed();
  }

  // Fallback regex manual jika toWellFormed belum ter-polyfill penuh
  return text.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "�");
}

/**
 * Menyelamatkan tool call yang rusak (Tool-Call Rescue).
 * Terkadang provider gratis mengembalikan pemanggilan fungsi di dalam body text biasa
 * alih-alih di struktur JSON `tool_calls` resmi. Fungsi ini mengekstrak JSON dari teks tersebut.
 */
export interface RescuedToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export function rescueToolCallsFromText(text: string): RescuedToolCall[] | null {
  if (!text || !text.includes("{")) return null;

  try {
    // Cari pola JSON {} secara rekursif/heuristik yang mencakup multiple lines
    // Kita cari '{' hingga '}' terluar
    const rescued: RescuedToolCall[] = [];
    let openBrackets = 0;
    let startIndex = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === "{") {
        if (openBrackets === 0) {
          startIndex = i;
        }
        openBrackets++;
      } else if (text[i] === "}") {
        if (openBrackets > 0) {
          openBrackets--;
          if (openBrackets === 0 && startIndex !== -1) {
            const potentialJson = text.substring(startIndex, i + 1);
            try {
              const parsed = JSON.parse(potentialJson);
              if (parsed.name && (parsed.arguments || parsed.args)) {
                rescued.push({
                  id: `call_${Math.random().toString(36).substring(2, 11)}`,
                  type: "function",
                  function: {
                    name: parsed.name,
                    arguments: typeof parsed.arguments === "object"
                      ? JSON.stringify(parsed.arguments)
                      : typeof parsed.args === "object"
                      ? JSON.stringify(parsed.args)
                      : String(parsed.arguments || parsed.args || "{}"),
                  },
                });
              }
            } catch {
              // Abaikan jika bukan JSON valid
            }
          }
        }
      }
    }

    return rescued.length > 0 ? rescued : null;
  } catch {
    return null;
  }
}

/**
 * Menangani provider yang tidak mendukung role "system".
 * Menggabungkan konten system message ke dalam user message pertama.
 */
export interface ChatMessage {
  role: string;
  content: string | any;
  [key: string]: any;
}

export function simulateSystemRole(messages: ChatMessage[]): ChatMessage[] {
  const systemMessages = messages.filter((m) => m.role === "system");
  if (systemMessages.length === 0) return messages;

  const otherMessages = messages.filter((m) => m.role !== "system");
  const firstUserMessageIndex = otherMessages.findIndex((m) => m.role === "user");

  const combinedSystemContent = systemMessages
    .map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content))
    .join("\n\n");

  if (firstUserMessageIndex !== -1) {
    // Tempelkan system prompt di awal pesan user pertama
    const firstUser = otherMessages[firstUserMessageIndex];
    const userContent = typeof firstUser.content === "string"
      ? firstUser.content
      : JSON.stringify(firstUser.content);

    otherMessages[firstUserMessageIndex] = {
      ...firstUser,
      content: `[System Instruction]\n${combinedSystemContent}\n\n[User Message]\n${userContent}`,
    };
    return otherMessages;
  } else {
    // Jika tidak ada user message, buat baru
    return [
      {
        role: "user",
        content: `[System Instruction]\n${combinedSystemContent}`,
      },
      ...otherMessages,
    ];
  }
}
