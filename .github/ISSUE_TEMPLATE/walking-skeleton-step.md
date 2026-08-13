---
name: Walking Skeleton Step
about: Satu unit kerja teknis sesuai urutan §12.1 di dokumen desain — scope kecil, dapat diverifikasi mesin
title: "[Step N] "
labels: walking-skeleton
---

**Step §12.1 ke berapa**:
<!-- mis. "Step 3 — Multi-key per provider + rotasi round-robin" -->

**Definition of Done (konkret, bisa dicek mesin)**:
<!-- Contoh benar: "curl ke POST /v1/chat/completions dengan 3 key terdaftar untuk
provider yang sama, key pertama dipakai, request kedua otomatis pakai key kedua —
dibuktikan lewat test yang lulus di CI." Bukan "rotasi key sudah diimplementasi". -->

**Kontrak yang dipakai/diubah**:
<!-- Link ke packages/core/src/adapter.contract.ts atau docs/adr/ jika kontrak baru diusulkan -->

**Di luar scope step ini (eksplisit)**:
<!-- Sebutkan apa yang SENGAJA tidak dikerjakan di step ini, supaya agen tidak
"sekalian" menambah fitur di luar step yang diminta. -->

**Test yang wajib lulus sebelum ditutup**:
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run test`
- [ ] `bun run anti-mock-check`
