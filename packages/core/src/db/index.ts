import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, "../../../../");

const dbPath = isTest ? join(workspaceRoot, "test.sqlite") : (process.env.DB_FILE_PATH || join(workspaceRoot, "local.sqlite"));
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

// Export everything from schema so other files can just import from db/index
export * from "./schema";
