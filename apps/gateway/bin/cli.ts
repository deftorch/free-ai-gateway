#!/usr/bin/env bun
/**
 * Free AI Gateway CLI Tool (`figw` / `bun run cli`)
 * Digunakan untuk manajemen Token, Key, Chaos Simulator, Canary Routing, dan Export/Import Config via CI/CD.
 */

const BASE_URL = process.env.GATEWAY_BASE_URL || "http://localhost:3000";
const ADMIN_TOKEN = process.env.INTERNAL_ADMIN_TOKEN || process.env.GATEWAY_ADMIN_TOKEN || "";

function printUsage() {
  console.log(`
===================================================
⚡ FREE AI GATEWAY CLI TOOL
===================================================

Penggunaan:
  bun run cli <command> [options]

Command yang tersedia:
  health                                        Cek metrik kesehatan & kapasitas provider
  tokens create --label <name> [options]        Buat Gateway Token baru (CI/CD)
  tokens revoke --id <tokenId>                  Revoke/hapus Gateway Token
  keys add --provider <p> --label <l> --key <k> Tambah API Key Provider baru
  keys delete --id <keyId>                      Hapus API Key Provider
  canary set --group <g> --main <m> --canary <c> --weight <w> Pasang Canary Traffic Splitting
  canary delete --group <g>                     Hapus aturan Canary Routing
  config export [--out file.json]               Ekspor konfigurasi gateway ke JSON
  config import --file file.json                Impor konfigurasi gateway dari file JSON

Opsi Tambahan:
  --max-requests <N>      Batas kuota RPD per token
  --allowed-models <list> Model yang diizinkan (pisahkan dengan koma)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];

  const getArg = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return null;
  };

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };

  try {
    switch (command) {
      case "health": {
        const res = await fetch(`${BASE_URL}/internal/health`, { headers: authHeaders });
        const json = await res.json();
        console.log("=== HEALTH & CAPACITY METRICS ===");
        console.dir(json, { depth: null });
        break;
      }

      case "tokens": {
        const sub = args[1];
        if (sub === "create") {
          const label = getArg("--label");
          if (!label) {
            console.error("Error: Opsi '--label' wajib diisi.");
            process.exit(1);
          }
          const maxReq = getArg("--max-requests");
          const allowed = getArg("--allowed-models");

          const res = await fetch(`${BASE_URL}/internal/tokens`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              projectLabel: label,
              maxDailyRequests: maxReq ? parseInt(maxReq, 10) : undefined,
              allowedModels: allowed ? allowed.split(",") : undefined,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            console.log("✅ Gateway Token Berhasil Dibuat!");
            console.log(`Project Label: ${json.token?.projectLabel}`);
            console.log(`RAW TOKEN    : ${json.rawToken}`);
          } else {
            console.error("❌ Gagal:", json.error);
          }
        } else if (sub === "revoke") {
          const id = getArg("--id");
          if (!id) {
            console.error("Error: Opsi '--id' wajib diisi.");
            process.exit(1);
          }
          const res = await fetch(`${BASE_URL}/internal/tokens?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: authHeaders,
          });
          const json = await res.json();
          console.log(res.ok ? "✅ Token berhasil di-revoke!" : `❌ Error: ${json.error}`);
        } else {
          printUsage();
        }
        break;
      }

      case "keys": {
        const sub = args[1];
        if (sub === "add") {
          const provider = getArg("--provider");
          const label = getArg("--label");
          const key = getArg("--key");
          if (!provider || !label || !key) {
            console.error("Error: Opsi '--provider', '--label', dan '--key' wajib diisi.");
            process.exit(1);
          }
          const res = await fetch(`${BASE_URL}/internal/keys`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({ providerId: provider, label, rawKey: key }),
          });
          const json = await res.json();
          console.log(res.ok ? "✅ API Key Provider Berhasil Disimpan!" : `❌ Error: ${json.error}`);
        } else if (sub === "delete") {
          const id = getArg("--id");
          if (!id) {
            console.error("Error: Opsi '--id' wajib diisi.");
            process.exit(1);
          }
          const res = await fetch(`${BASE_URL}/internal/keys?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: authHeaders,
          });
          const json = await res.json();
          console.log(res.ok ? "✅ API Key Provider Berhasil Dihapus!" : `❌ Error: ${json.error}`);
        } else {
          printUsage();
        }
        break;
      }

      case "canary": {
        const sub = args[1];
        if (sub === "set") {
          const group = getArg("--group");
          const mainModel = getArg("--main");
          const canaryModel = getArg("--canary");
          const weight = getArg("--weight");

          if (!group || !mainModel || !canaryModel || !weight) {
            console.error("Error: Opsi '--group', '--main', '--canary', dan '--weight' wajib diisi.");
            process.exit(1);
          }

          const res = await fetch(`${BASE_URL}/internal/canary`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              groupName: group,
              mainModel,
              canaryModel,
              canaryWeight: parseInt(weight, 10),
            }),
          });
          const json = await res.json();
          console.log(res.ok ? `✅ Canary Rule Diaktifkan: ${json.message}` : `❌ Error: ${json.error}`);
        } else if (sub === "delete") {
          const group = getArg("--group");
          if (!group) {
            console.error("Error: Opsi '--group' wajib diisi.");
            process.exit(1);
          }
          const res = await fetch(`${BASE_URL}/internal/canary?groupName=${encodeURIComponent(group)}`, {
            method: "DELETE",
            headers: authHeaders,
          });
          const json = await res.json();
          console.log(res.ok ? `✅ Aturan Canary Dinonaktifkan!` : `❌ Error: ${json.error}`);
        }
        break;
      }

      case "config": {
        const sub = args[1];
        if (sub === "export") {
          const outFile = getArg("--out") || "gateway-config.json";
          const res = await fetch(`${BASE_URL}/internal/config`, { headers: authHeaders });
          const json = await res.json();
          if (res.ok) {
            await Bun.write(outFile, JSON.stringify(json, null, 2));
            console.log(`✅ Konfigurasi Gateway Berhasil Diekspor ke '${outFile}'!`);
          } else {
            console.error("❌ Gagal mengekspor:", json.error);
          }
        } else if (sub === "import") {
          const inFile = getArg("--file");
          if (!inFile) {
            console.error("Error: Opsi '--file <path>' wajib diisi.");
            process.exit(1);
          }
          const file = Bun.file(inFile);
          if (!(await file.exists())) {
            console.error(`Error: File '${inFile}' tidak ditemukan.`);
            process.exit(1);
          }
          const json = await file.json();
          const res = await fetch(`${BASE_URL}/internal/config`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(json),
          });
          const result = await res.json();
          console.log(res.ok ? `✅ Impor Berhasil! (${result.message})` : `❌ Gagal mengimpor: ${result.error}`);
        }
        break;
      }

      default:
        printUsage();
        break;
    }
  } catch (err: any) {
    console.error("❌ Error Eksekusi CLI:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
