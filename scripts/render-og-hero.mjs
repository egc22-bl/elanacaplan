#!/usr/bin/env node
/**
 * Renders public/static/og-social-v4.png (1200×630) from og.html
 * Run: npm run render:og
 * Requires: npm i && npx playwright install chromium
 */
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outPath = path.join(root, "public", "static", "og-social-v4.png");
const outPathLegacy = path.join(root, "public", "static", "og-social.png");
const outPathV2 = path.join(root, "public", "static", "og-social-v2.png");
const outPathV3 = path.join(root, "public", "static", "og-social-v3.png");
const port = 9876;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      let rel = u.pathname === "/" ? "og.html" : u.pathname.slice(1);
      if (rel.includes("..")) {
        res.writeHead(403);
        return res.end();
      }
      const fp = path.join(root, rel);
      if (!fp.startsWith(root)) {
        res.writeHead(403);
        return res.end();
      }
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(404);
          return res.end();
        }
        res.writeHead(200, {
          "Content-Type": mime[path.extname(fp)] || "application/octet-stream",
        });
        res.end(data);
      });
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const server = await startStaticServer();
  await sleep(80);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Missing playwright. From repo root run:\n  npm i && npx playwright install chromium",
    );
    server.close();
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/og.html`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await sleep(400);

    await page.screenshot({
      path: outPath,
      type: "png",
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    fs.copyFileSync(outPath, outPathLegacy);
    fs.copyFileSync(outPath, outPathV2);
    fs.copyFileSync(outPath, outPathV3);
    const st = fs.statSync(outPath);
    console.log(`Wrote ${outPath} (${st.size} bytes)`);
    console.log(`Also updated og-social.png, og-social-v2.png, og-social-v3.png`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
