import { describe, it, expect } from "bun:test";
import { parseFreeLlmResourcesMarkdown } from "./free-llm-resources";

describe("Free LLM Resources Catalog Parser", () => {
  it("harus mem-parse markdown provider dan tabel/bullet model dengan benar", () => {
    const sampleMarkdown = `
### [Google AI Studio](https://aistudio.google.com)
<table><thead><tr><th>Model Name</th><th>Model Limits</th></tr></thead><tbody>
<tr><td>Gemini 2.5 Flash</td><td>250,000 tokens/minute</td></tr>
<tr><td>Gemini 2.5 Flash-Lite</td><td>250,000 tokens/minute</td></tr>
</tbody></table>

### [Groq](https://console.groq.com)
<table><thead><tr><th>Model Name</th><th>Model Limits</th></tr></thead><tbody>
<tr><td>Llama 3.3 70B</td><td>1,000 requests/day</td></tr>
</tbody></table>

### [OpenRouter](https://openrouter.ai)
- [google/gemma-4-31b-it:free](https://openrouter.ai/google/gemma-4-31b-it:free)
- [openai/gpt-oss-20b:free](https://openrouter.ai/openai/gpt-oss-20b:free)
`;

    const parsed = parseFreeLlmResourcesMarkdown(sampleMarkdown);

    expect(parsed.length).toBe(3);

    const google = parsed.find((p) => p.providerName === "Google AI Studio");
    expect(google).toBeDefined();
    expect(google?.models).toContain("Gemini 2.5 Flash");
    expect(google?.models).toContain("Gemini 2.5 Flash-Lite");

    const groq = parsed.find((p) => p.providerName === "Groq");
    expect(groq).toBeDefined();
    expect(groq?.models).toContain("Llama 3.3 70B");

    const openrouter = parsed.find((p) => p.providerName === "OpenRouter");
    expect(openrouter).toBeDefined();
    expect(openrouter?.models).toContain("google/gemma-4-31b-it:free");
  });
});
