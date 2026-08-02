import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../../packages/database/src/schema";
import { generateGatewayToken } from "../../packages/core/src/crypto";

import fs from "fs";
import path from "path";

async function main() {
  const envPath = path.resolve("../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^KEY_ENCRYPTION_SECRET=(.*)/);
      if (match) {
        process.env.KEY_ENCRYPTION_SECRET = match[1].trim();
      }
    }
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const { rawToken, tokenHash } = await generateGatewayToken();
  await db.insert(schema.gatewayTokens).values({
    projectLabel: "test_project",
    tokenHash,
    status: "active",
  });

  console.log("Token:", rawToken);
}

main();
