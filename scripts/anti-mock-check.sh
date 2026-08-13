#!/usr/bin/env bash
# Menolak mock/stub/TODO/placeholder di kode produksi (bukan file test).
# Dipakai oleh: .github/workflows/anti-mock.yml dan pre-commit hook (lint-staged).
# Lihat CLAUDE.md root, aturan keras poin 1.

set -euo pipefail

PATTERN='TODO|FIXME|NotImplementedError|placeholder'
MOCK_PATTERN='\bmock\b|\bstub\b'

# Cari di source production: packages/*/src dan adapters/*/src, exclude file test.
MATCHES=$(grep -rnE "${PATTERN}|${MOCK_PATTERN}" \
  --include="*.ts" --include="*.tsx" \
  packages/*/src adapters/*/src 2>/dev/null \
  | grep -v -E '\.(test|spec)\.tsx?:' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "❌ Ditemukan mock/stub/TODO/placeholder di kode produksi:"
  echo "$MATCHES"
  echo ""
  echo "Kalau task tidak bisa diselesaikan karena butuh key/akses yang belum ada,"
  echo "berhenti dan tanya — jangan isi dengan mock diam-diam (lihat CLAUDE.md)."
  exit 1
fi

echo "✅ Tidak ada mock/stub/TODO/placeholder di kode produksi."
