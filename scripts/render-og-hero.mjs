#!/usr/bin/env node
/**
 * Renders public/static/og-social.png (1200×630) from the real index.html + styles.css
 * using headless Chromium. Run from repo root: node scripts/render-og-hero.mjs
 * Requires: npm i playwright && npx playwright install chromium
 */
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const root = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outPath = path.join(root, "public", "static", "og-social.png");
const port = 9876;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      let rel = u.pathname === "/" ? "index.html" : u.pathname.slice(1);
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

/** Capture-only: freeze motion, crop document to OG frame, match live hero chrome */
const captureCss = `
  [data-reveal] { opacity: 1 !important; transform: none !important; }
  .route { stroke-dashoffset: 0 !important; animation: none !important; }
  main > section:not(.hero),
  main > .atmospheric-break,
  .site-footer,
  footer { display: none !important; }
  html, body {
    margin: 0 !important;
    width: 1200px !important;
    height: 630px !important;
    overflow: hidden !important;
  }
  .site-shell {
    min-height: 630px !important;
    max-height: 630px !important;
    overflow: hidden !important;
  }
  .site-header {
    position: static !important;
    min-height: 76px !important;
    width: 100% !important;
  }
  section.hero {
    min-height: calc(630px - 76px) !important;
    height: calc(630px - 76px) !important;
    max-height: calc(630px - 76px) !important;
    padding: 48px 0 32px !important;
    overflow: hidden !important;
    align-items: flex-end !important;
  }
`;

async function main() {
  const server = await startStaticServer();
  await sleep(80);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "Missing playwright. From repo root run:\n  npm init -y && npm i playwright && npx playwright install chromium",
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
    await page.goto(`http://127.0.0.1:${port}/index.html`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.evaluate(() => document.fonts.ready).catch(() => {});

    await page.evaluate(() => {
      const eb = document.querySelector(".hero .eyebrow");
      if (eb) {
        eb.innerHTML =
          '<span class="brand-mark">Elana Caplan</span> / Diagnostic operational leadership';
      }
    });

    await page.addStyleTag({ content: captureCss });
    await sleep(250);

    await page.screenshot({
      path: outPath,
      type: "png",
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
  } finally {
    await browser.close();
    server.close();
  }

  const st = fs.statSync(outPath);
  console.log(`Wrote ${outPath} (${st.size} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
