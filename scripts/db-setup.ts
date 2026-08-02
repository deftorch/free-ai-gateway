import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

async function setupClickHouse() {
  console.log("Setting up ClickHouse schema...");
  const clickhouseUrl = process.env.CLICKHOUSE_URL || "http://localhost:8123";
  const clickhouseUser = process.env.CLICKHOUSE_USER || "default";
  const clickhousePassword = process.env.CLICKHOUSE_PASSWORD || "";

  try {
    const schemaPath = join(process.cwd(), "packages/database/clickhouse/schema.sql");
    const sql = readFileSync(schemaPath, "utf-8");

    // ClickHouse HTTP API accepts multiple statements if we send them sequentially or if we format them correctly, 
    // but the safest way is to split by ';' and execute them one by one.
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      const res = await fetch(`${clickhouseUrl}/?user=${clickhouseUser}&password=${clickhousePassword}`, {
        method: "POST",
        body: stmt,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`ClickHouse Error: ${errorText}`);
      }
    }
    console.log("ClickHouse schema created successfully.");
  } catch (err) {
    console.error("Failed to setup ClickHouse:", err);
    throw err;
  }
}

async function main() {
  console.log("Starting DB Setup...");
  
  // 1. Setup Postgres with Drizzle
  try {
    console.log("Pushing Postgres schema using Drizzle...");
    execSync("cd packages/database && bunx drizzle-kit push", { stdio: "inherit" });
    console.log("Postgres schema pushed successfully.");
  } catch (err) {
    console.error("Failed to push Postgres schema.");
    process.exit(1);
  }

  // 2. Setup ClickHouse
  await setupClickHouse();

  console.log("Database setup complete!");
}

main().catch((err) => {
  console.error("Error during DB setup:", err);
  process.exit(1);
});
