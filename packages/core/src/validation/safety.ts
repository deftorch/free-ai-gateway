export interface PromptSafetyResult {
  isSafe: boolean;
  violationReason?: string;
}

// Daftar regex heuristik untuk mendeteksi Prompt Injection dan Jailbreaks
// Pola ini umum digunakan pada jailbreak "DAN" (Do Anything Now) atau "Ignore previous instructions".
const PROMPT_INJECTION_PATTERNS = [
  /(?:ignore|disregard|forget|bypass)\s+(?:all\s+)?(?:previous\s+)?(?:instructions|directions|prompts)/i,
  /\bsystem\s+(?:override|bypass)\b/i,
  /\b(?:DAN|Do Anything Now|AIM|Always Intelligent and Machiavellian)\b/i,
  /you\s+are\s+now\s+(?:unrestricted|free\s+from\s+rules|developer\s+mode)/i,
  /print\s+(?:your\s+)?(?:initial|system|original)\s+prompt/i,
];

/**
 * Menganalisis konten pesan klien untuk mendeteksi ancaman jailbreak/prompt injection.
 * Tujuannya agar API Key AI Gateway tidak terkena ban oleh Provider (OpenAI/Anthropic).
 */
export function analyzePromptSafety(messages: any[]): PromptSafetyResult {
  if (!messages || !Array.isArray(messages)) return { isSafe: true };

  for (const msg of messages) {
    let textContent = "";
    if (typeof msg.content === "string") {
      textContent = msg.content;
    } else if (Array.isArray(msg.content)) {
      textContent = msg.content
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");
    }

    if (!textContent) continue;
    
    // Scan menggunakan heuristic regex
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(textContent)) {
        return {
          isSafe: false,
          violationReason: "Malicious prompt pattern detected (Jailbreak/Injection attempt). Request blocked by AI Gateway Safety WAF.",
        };
      }
    }
  }

  return { isSafe: true };
}
