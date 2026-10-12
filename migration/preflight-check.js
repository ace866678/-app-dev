#!/usr/bin/env node
/**
 * Static migration preflight. Does not connect to Supabase or Firebase.
 * Does not read/write exported datasets or access credentials.
 */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "migration/export-supabase-data.js",
  "migration/inventory-firebase-users.js",
  "migration/transform-data.js",
  "migration/package.json",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error("Preflight failed: required source files are missing.");
  for (const file of missing) console.error(` - ${file}`);
  process.exit(1);
}

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const forbiddenPathPatterns = [
  /^migration\/supabase-export\//i,
  /^migration\/firebase-import\//i,
  /^migration\/firebase-users\.json$/i,
  /^migration\/user-mapping\.json$/i,
  /^migration\/.*(?:service-account.*\.json|\.pem|\.key)$/i,
  /^migration\/(?:MIGRATION_REVIEW_REPORT|MIGRATION_STATUS_REPORT|ACCOUNT_CREATION_PLAN|PREFLIGHT_ACCOUNT_CREATION_REPORT)\.md$/i,
];

const forbiddenTracked = tracked.filter((path) =>
  forbiddenPathPatterns.some((pattern) => pattern.test(path)),
);
if (forbiddenTracked.length) {
  console.error("Preflight failed: generated/private migration artifacts are tracked by Git.");
  for (const path of forbiddenTracked) console.error(` - ${path}`);
  process.exit(1);
}

const secretPatterns = [
  { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "literal service-role credential", pattern: /\bservice_role\s*[:=]\s*["'][^"']{24,}["']/i },
  { label: "literal Supabase service-role key assignment", pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']{16,}["']/i },
  { label: "literal Firebase service-account JSON assignment", pattern: /\bFIREBASE_SERVICE_ACCOUNT_JSON\s*=\s*["'][{]/i },
];

for (const file of requiredFiles.filter((p) => p.endsWith(".js"))) {
  const source = readFileSync(file, "utf8");
  const matches = secretPatterns.filter(({ pattern }) => pattern.test(source));
  if (matches.length) {
    console.error(`Preflight failed: possible credential literal in ${file} (${matches.map((m) => m.label).join(", ")}).`);
    process.exit(1);
  }
}

console.log("Preflight passed: source files are present, generated/private artifacts are not tracked, and no known literal credential patterns were detected in migration scripts.");
console.log("Scope: static checks only; no remote calls or production writes were attempted.");
