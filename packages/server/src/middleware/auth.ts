import type { MiddlewareHandler } from "hono";
import { db, virtualKeys } from "@free-ai-gateway/core";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import type { AppEnv } from "../index";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: { message: "Missing or invalid Authorization header", type: "auth_failed" } }, 401);
  }

  const token = authHeader.replace("Bearer ", "").trim();
  
  // Hash token
  const hash = createHash("sha256").update(token).digest("hex");

  // Lookup in DB
  const [keyRecord] = await db.select().from(virtualKeys).where(eq(virtualKeys.keyHash, hash));
  
  if (!keyRecord) {
    return c.json({ error: { message: "Invalid virtual key", type: "auth_failed" } }, 401);
  }

  // Inject tenant_id and scopes to context
  c.set("tenantId", keyRecord.tenantId);
  c.set("scopes", keyRecord.scopes as string[]);

  await next();
};
