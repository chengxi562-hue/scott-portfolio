#!/usr/bin/env node
// Pre-publish integrity check for the static site. No network, no deps.
// node scripts/check.mjs   -> exit 1 on any failure.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, normalize } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n");
const html = tracked.filter((f) => f.endsWith(".html"));
const fails = [], notes = [];
const fail = (m) => fails.push(m);

const BUDGET_KB = { image: 600, font: 220, script: 40, style: 40 };
const ALLOWED_EXTERNAL = /^(https:\/\/(yichengxi\.cn|github\.com|www\.linkedin\.com)\/|mailto:)/;

for (const file of html) {
  const src = readFileSync(join(ROOT, file), "utf8");
  // 1) every local href/src/srcset target exists (and is tracked, so it actually ships)
  const refs = [...src.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const s of src.matchAll(/\ssrcset="([^"]+)"/g)) refs.push(...s[1].split(",").map((x) => x.trim().split(/\s+/)[0]));
  for (const ref of refs) {
    if (ref.startsWith("#") || ref.startsWith("data:")) continue;
    if (/^[a-z]+:/i.test(ref)) { if (!ALLOWED_EXTERNAL.test(ref)) fail(`${file}: external link not allowlisted: ${ref}`); continue; }
    let path = ref.split(/[?#]/)[0];
    path = path.startsWith("/") ? path.slice(1) : normalize(join(dirname(file), path));
    path = path.replace(/^\.\/?/, "");
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (!existsSync(join(ROOT, path))) fail(`${file}: missing ${ref}`);
    else if (!tracked.includes(path) && statSync(join(ROOT, path)).isFile()) fail(`${file}: ${ref} exists locally but is not tracked (would 404 online)`);
  }
  // 2) inline scripts must match the CSP sha256 list (DEVELOPMENT.md rule)
  const csp = (src.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  const inline = [...src.matchAll(/<script(?![^>]*\s(?:src=|type="application\/ld\+json"))[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((x) => x.trim());
  for (const body of inline) {
    const h = "'sha256-" + createHash("sha256").update(body).digest("base64") + "'";
    if (!csp) fail(`${file}: inline script but no CSP`);
    else if (!csp.includes(h)) fail(`${file}: inline script hash ${h} not in CSP`);
  }
  if (csp && /unsafe-inline|unsafe-eval/.test(csp.split("script-src")[1]?.split(";")[0] || "")) fail(`${file}: script-src allows unsafe-*`);
}

// 3) sitemap URLs map to tracked pages
const sitemap = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
for (const [, loc] of sitemap.matchAll(/<loc>https:\/\/yichengxi\.cn\/([^<]*)<\/loc>/g)) {
  const p = (loc || "") + (loc.endsWith("/") || !loc ? "index.html" : "");
  if (!tracked.includes(p)) fail(`sitemap: ${loc || "/"} has no tracked page`);
}

// 4) weight budgets for assets referenced by pages
for (const f of tracked.filter((x) => existsSync(join(ROOT, x)))) {
  const kb = statSync(join(ROOT, f)).size / 1024;
  const kind = /\.(jpe?g|png|avif|webp)$/.test(f) ? "image" : /\.woff2$/.test(f) ? "font" : /\.m?js$/.test(f) && !f.includes(".test.") ? "script" : /\.css$/.test(f) ? "style" : null;
  if (!kind) continue;
  const referenced = html.some((h) => readFileSync(join(ROOT, h), "utf8").includes(f.split("/").pop()));
  if (kind === "image" && f.endsWith("curiosity-window.png")) { notes.push(`legacy PNG fallback ${kb.toFixed(0)}KB (only for browsers without <picture>)`); continue; }
  if (referenced && kb > BUDGET_KB[kind]) fail(`budget: ${f} ${kb.toFixed(0)}KB > ${BUDGET_KB[kind]}KB`);
}

// 5) JSON-LD must parse (it is data, not CSP-hashed)
for (const file of html) {
  for (const [, body] of readFileSync(join(ROOT, file), "utf8").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(body); } catch (e) { fail(`${file}: JSON-LD invalid: ${e.message}`); }
  }
}

// 6) ignored dirs never tracked
for (const f of tracked) if (/^(_dev|\.playwright-cli|\.claude)\//.test(f)) fail(`private dir tracked: ${f}`);

for (const n of notes) console.log("note:", n);
if (fails.length) { for (const f of fails) console.error("FAIL", f); console.error(`${fails.length} problem(s)`); process.exit(1); }
console.log(`OK ${html.length} pages checked`);
