# Security Policy

## Kenapa ini penting untuk proyek ini

Gateway self-hosted hanya seaman seluruh rantai build & rilisnya. Insiden keamanan
pada gateway sejenis (LiteLLM, 2024/2025) adalah pengingat bahwa supply-chain
security wajib masuk desain sejak awal — bukan ditambahkan belakangan. Lihat
`docs/desain-free-ai-gateway-gabungan.md` §13.

## Melaporkan kerentanan

Jangan buka issue publik untuk kerentanan keamanan. Laporkan lewat:

- **GitHub Security Advisories** (tab "Security" > "Report a vulnerability") — jalur yang disarankan.
- Atau email ke: `security@<domain-proyek>` (ganti dengan email resmi maintainer sebelum rilis publik).

Sertakan: langkah reproduksi, dampak yang mungkin terjadi, versi yang terpengaruh.

## Apa yang bisa diharapkan

- Konfirmasi diterima dalam 72 jam.
- Update status berkala sampai ada patch.
- Kredit di changelog rilis (kecuali diminta anonim).

## Cakupan

Termasuk (tapi tidak terbatas pada):
- Kebocoran provider key (enkripsi at-rest, key encryption key)
- Bypass virtual key / lookup tenant (lihat `docs/adr/0004-...`)
- Bypass scoping tool MCP
- Kerentanan di dependency pihak ketiga yang dipakai gateway ini

## Praktik yang ditegakkan repo ini

- Dependabot untuk update dependency mingguan (`.github/dependabot.yml`)
- CodeQL + `osv-scanner` + `bun pm scan` di tiap PR (`.github/workflows/security-scan.yml`)
- SBOM (CycloneDX) di-generate tiap rilis (`.github/workflows/sbom.yml`)
