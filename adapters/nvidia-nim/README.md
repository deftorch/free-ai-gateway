# adapters/nvidia-nim — status: Step 1 diimplementasikan

Adapter NVIDIA NIM (build.nvidia.com / integrate.api.nvidia.com) memenuhi
`ProviderAdapter`. API-nya sudah OpenAI-compatible penuh, jadi adapter ini jauh
lebih tipis dari `adapters/gemini` — hampir tidak ada translasi request/response,
cuma perbedaan auth header (`Authorization: Bearer`, bukan `x-goog-api-key`) dan
base URL.

## Model

Model ID NVIDIA NIM berformat namespace, mis. `meta/llama-3.3-70b-instruct`,
`deepseek-ai/deepseek-r1`, `zhipuai/glm-4` — cek katalog lengkap di
https://build.nvidia.com/models. Adapter ini **tidak hardcode nama model apa
pun**, klien yang menentukan lewat field `model`.

## Yang BELUM ada

- Fixture contract test nyata (masih placeholder, sama seperti Gemini)
- Multi-key/rotasi (Step 3)
- Auto-resolve provider dari nama model (Step 9) — untuk sekarang klien wajib
  kirim field `provider: "nvidia-nim"` eksplisit, lihat `packages/server/CLAUDE.md`

## Cara verifikasi manual

Lihat README root bagian "Verifikasi Step 1".
