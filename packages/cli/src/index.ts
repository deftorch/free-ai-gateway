#!/usr/bin/env node
import { Command } from "commander";

/**
 * CLI `aigw` — wrapper tipis di atas REST API packages/server (§12.1 step 7).
 * Murah dibuat kalau core sudah benar dipisah dari channel — jangan
 * duplikasi logika di sini, cuma panggil endpoint yang sudah ada di server.
 *
 * Baru berguna kalau packages/server sudah punya endpoint sungguhan (step 0-6
 * walking skeleton). Command di bawah ini hanya kerangka CLI, belum memanggil
 * apa pun yang nyata.
 */
const program = new Command();

program
  .name("aigw")
  .description("CLI untuk Free AI Gateway")
  .version("0.0.1");

program
  .command("status")
  .description("Lihat status key & provider (§6 item 6) — BELUM diimplementasikan")
  .action(() => {
    console.error(
      "Belum diimplementasikan: aigw status membutuhkan endpoint /status di " +
        "packages/server yang belum ada. Lihat CLAUDE.md di packages/cli.",
    );
    process.exitCode = 1;
  });

program.parse();
