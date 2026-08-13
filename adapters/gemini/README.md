# adapters/gemini — status: Step 0 diimplementasikan

Adapter Gemini memenuhi `ProviderAdapter` dari `packages/core/src/adapter.contract.ts`,
memanggil Gemini API sungguhan (`generateContent` & `streamGenerateContent`, lihat
komentar di `src/adapter.ts` untuk referensi format resmi yang dipakai).

## Yang sudah ada (Step 0)

- `chatCompletion()` — non-streaming, translasi penuh request/response OpenAI ↔ Gemini
- `chatCompletionStream()` — parsing SSE manual dari `streamGenerateContent?alt=sse`
- `listModels()` — daftar model dari `GET /v1beta/models`
- Klasifikasi error (`rate_limited`, `auth_failed`, `model_not_found`, dst) dari
  status HTTP & `error.status` Gemini

## Yang BELUM ada (scope step berikutnya, jangan dikerjakan di sini)

- Multi-key/rotasi (Step 3) — saat ini cuma 1 key dari `GEMINI_API_KEYS` di server
- Fixture contract test nyata di `adapters/_contract-tests/fixtures/gemini/` masih
  placeholder (lihat catatan di file JSON-nya) — belum direkam dari response asli
- Registrasi ke `adaptersToTest` di `adapters/_contract-tests/adapter.contract.test.ts`
  masih kosong

## Cara verifikasi manual

Lihat instruksi curl di README root repo bagian "Verifikasi Step 0".
