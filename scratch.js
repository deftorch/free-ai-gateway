const fs = require('fs');

const files = [
  "apps/gateway/app/v1/openapi.json/route.ts",
  "apps/gateway/app/internal/models/models.test.ts",
  "apps/gateway/app/internal/config/config.test.ts",
  "apps/gateway/app/dashboard/page.tsx",
  "apps/gateway/app/api/cron/cron.test.ts",
  "apps/gateway/app/internal/canary/canary.test.ts",
  "apps/gateway/app/dashboard/components/ConfigGeneratorWidget.tsx",
  "apps/gateway/app/dashboard/components/RoutingTab.tsx",
  "apps/gateway/app/dashboard/components/PlaygroundTab.tsx",
  "apps/gateway/app/api/mcp/route.ts",
  "packages/database/drizzle/seed.ts",
  "packages/core/src/notifications/alerting.test.ts",
  "packages/core/src/router/smart-router.test.ts",
  "packages/core/src/router/router.test.ts",
  "packages/core/src/router/index.ts",
  "packages/core/src/providers/anthropic-map.test.ts",
  "packages/core/src/providers/types.ts",
  "packages/core/src/providers/providers.test.ts",
  "packages/core/src/logging/logging.test.ts",
  "packages/core/src/core/gateway.test.ts",
  "packages/core/src/validation/validation.test.ts",
  "packages/core/src/router/smart-router.ts",
  "packages/core/src/providers/anthropic-map.ts"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/groq\/llama-3\.3-70b-versatile/g, "groq/openai/gpt-oss-120b");
  content = content.replace(/llama-3\.3-70b-versatile/g, "openai/gpt-oss-120b");
  fs.writeFileSync(file, content);
}
console.log("Replaced strings");
