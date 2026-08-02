const fs = require('fs');
const path = require('path');

const filesToFix = [
  "packages/core/src/router/key-pool.ts",
  "packages/core/src/router/index.ts",
  "packages/core/src/kv/client.ts",
  "packages/core/src/auth.ts",
  "apps/gateway/app/internal/chaos/route.ts",
  "apps/gateway/app/internal/tokens/route.ts",
  "apps/gateway/app/api/cron/health-probe/route.ts"
];

for (const rel of filesToFix) {
  const file = path.join(__dirname, rel);
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g, ".catch((e) => { console.error('[SilentError]', e); })");
  // Some might be formatting with spaces/newlines, we'll try basic regex
  fs.writeFileSync(file, content);
}
console.log("Fixed empty catches");
