# ADR 0001: TypeScript + Hono, bukan Go (Bifrost-style) atau Python (LiteLLM-style)

**Status**: Diterima

## Konteks

Gateway harus jalan enak di serverless/edge (Cloudflare Workers, Deno Deploy, Vercel
Edge) *dan* self-host (Docker/VPS/K8s) dari satu codebase yang sama. Kompetitor besar
memilih Go (Bifrost, performa mentah) atau Python (LiteLLM, ekosistem AI/ML).

## Keputusan

Pakai TypeScript di atas runtime Web Standard (`fetch`, `Request`/`Response`), dengan
Hono sebagai web framework.

## Konsekuensi

- Satu kode jalan tanpa perubahan di Workers, Deno, Bun, Node.js — portabilitas
  deploy jadi diferensiator utama proyek.
- Trade-off: performa mentah kalah dari Go. Diterima karena beban gateway ini
  I/O-bound (nunggu response provider LLM), bukan CPU-bound.
- Konsekuensi turunan: ORM harus yang edge-compatible (lihat ADR 0003), storage state
  harus lewat interface abstrak `KVStore` (Cloudflare KV/Durable Objects vs
  Redis/Valkey) supaya core tidak peduli platform.

## Alternatif yang ditolak

- **Go**: performa lebih baik tapi tidak native di semua target serverless populer;
  akan butuh dua implementasi (native + WASM) untuk cover Workers dengan baik.
- **Python**: ekosistem AI/ML lebih matang tapi runtime melambat di beban berat dan
  tidak native di edge runtime manapun.
