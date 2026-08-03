// Browser-level integration coverage for the /intake UI.
//
// Uses puppeteer-core with the system Chromium to exercise the actual
// rendered DOM: file upload, text selection via native browser Range,
// selector minting, Return verification, malformed UTF-8 rejection, and
// session bundle export.
//
// Run: npm run test:browser
//
// Requires:
//   - `npm run build` to have been run (dist/server/index.js exists)
//   - puppeteer-core installed: npm install -D puppeteer-core
//   - system Chromium at /usr/bin/chromium

import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const clientDir = join(distDir, "client");

// ── MIME types for static asset serving ──
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

// ── Start a local HTTP server wrapping the built vinext worker ──
async function startServer() {
  const workerUrl = new URL("file://" + join(distDir, "server", "index.js"));
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname;

      if (
        pathname.startsWith("/assets/") ||
        pathname.startsWith("/static/") ||
        extname(pathname) !== ""
      ) {
        const filePath = join(clientDir, pathname);
        if (existsSync(filePath) && readFileSync(filePath, "utf8").length > 0) {
          const ext = extname(filePath);
          const mime = MIME_TYPES[ext] || "application/octet-stream";
          const body = readFileSync(filePath);
          res.writeHead(200, {
            "Content-Type": mime,
            "Cache-Control": "no-cache",
          });
          res.end(body);
          return;
        }
      }

      const response = await worker.fetch(
        new Request("http://localhost" + req.url, {
          method: req.method,
          headers: req.headers,
        }),
        {
          ASSETS: {
            fetch: async (assetUrl) => {
              const ap = typeof assetUrl === "string" ? assetUrl : assetUrl.pathname;
              const filePath = join(clientDir, ap);
              if (existsSync(filePath)) {
                const ext = extname(filePath);
                const mime = MIME_TYPES[ext] || "application/octet-stream";
                return new Response(readFileSync(filePath), {
                  headers: { "Content-Type": mime },
                });
              }
              return new Response("Not found", { status: 404 });
            },
          },
        },
        {
          waitUntil() {},
          passThroughOnException() {},
        },
      );

      res.writeHead(response.status, Object.fromEntries(response.headers));
      const body = await response.arrayBuffer();
      res.end(Buffer.from(body));
    } catch (err) {
      console.error("Server error:", err);
      res.writeHead(500);
      res.end("Internal server error");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        server,
        port: addr.port,
        url: `http://127.0.0.1:${addr.port}`,
      });
    });
  });
}

// ── Launch Puppeteer with the system Chromium ──
async function getBrowser() {
  const puppeteer = await import("puppeteer-core");
  return puppeteer.default.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

// ── Helpers for Puppeteer ──
async function getText(page, selector) {
  return page.$eval(selector, (el) => el.textContent);
}

async function getClassName(page, selector) {
  return page.$eval(selector, (el) => el.className);
}

async function getCount(page, selector) {
  return page.$$eval(selector, (els) => els.length);
}

async function waitForVisible(page, selector, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const count = await getCount(page, selector);
    if (count > 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for "${selector}" to appear`);
}

async function waitForText(page, text, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText && bodyText.includes(text)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for text "${text}" to appear`);
}

async function waitForFunction(page, fn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await page.evaluate(fn);
    if (result) return result;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timeout waiting for function to return truthy`);
}

// ── Source text with repeated phrases (3x each, including non-ASCII) ──
const REPEATED_SOURCE = [
  "The phrase café réappears here.",
  "And café réappears once more.",
  "Finally, café réappears a third time.",
  "",
  "Another phrase: résumé déjà vu",
  "Repeat: résumé déjà vu again",
  "Last: résumé déjà vu once more",
].join("\n");

const PHRASE_1 = "café réappears";

function nthIndexOf(text, needle, n) {
  let idx = -1;
  for (let i = 0; i < n; i++) {
    idx = text.indexOf(needle, idx + 1);
    if (idx < 0) return -1;
  }
  return idx;
}

function charToByteOffset(text, charOffset) {
  return new TextEncoder().encode(text.slice(0, charOffset)).length;
}

// ── Helper: set a DOM Range selection on the <pre> element ──
async function setSelection(page, charStart, charEnd) {
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(
    (start, end) => {
      const pre = document.querySelector(".intake-source-text");
      if (!pre) throw new Error("Source <pre> not found");
      let textNode = null;
      for (const child of pre.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.length >= end) {
          textNode = child;
          break;
        }
      }
      if (!textNode) {
        if (pre.firstChild && pre.firstChild.nodeType === Node.TEXT_NODE) {
          textNode = pre.firstChild;
        } else {
          throw new Error("No suitable text node found in <pre>");
        }
      }
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    },
    charStart,
    charEnd,
  );
  await page.$eval(".intake-source-text", (el) => {
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
}

// ── Main test: all 8 scenarios in one browser session ──
test("browser: full /intake integration — import, select, mint, return, tamper, malformed, export", async () => {
  const serverEntry = join(distDir, "server", "index.js");
  if (!existsSync(serverEntry)) {
    assert.fail("dist/server/index.js not found — run `npm run build` first");
  }

  const { server, url: baseUrl } = await startServer();

  let browser;
  let page;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    // ── Scenario 1: Import text with repeated phrases (3x each, non-ASCII) ──
    await page.goto(`${baseUrl}/intake`, { waitUntil: "networkidle0" });

    const heading = await getText(page, "h2");
    assert.ok(heading && heading.includes("Import"),
      `Expected "Import" heading, got: ${heading}`);

    const { writeFileSync: wf1 } = await import("node:fs");
    const tmpPath1 = `/tmp/intake-test-source-${process.pid}.txt`;
    wf1(tmpPath1, REPEATED_SOURCE, "utf-8");
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(tmpPath1);

    await waitForVisible(page, ".intake-source-text");

    const displayedText = await getText(page, ".intake-source-text");
    assert.ok(
      displayedText && displayedText.includes(PHRASE_1),
      "Source text should contain the repeated phrase",
    );

    const noticeText = await getText(page, ".notice");
    assert.ok(
      noticeText && noticeText.includes("Imported"),
      `Expected "Imported" in notice, got: ${noticeText}`,
    );
    assert.ok(
      !noticeText.includes("Admitted"),
      "Notice must not say 'Admitted'",
    );

    // ── Scenario 2: Select the 2nd occurrence through the rendered DOM ──
    const charStart2 = nthIndexOf(REPEATED_SOURCE, PHRASE_1, 2);
    const charEnd2 = charStart2 + PHRASE_1.length;
    assert.ok(charStart2 >= 0, "Second occurrence should be found");

    await setSelection(page, charStart2, charEnd2);

    const previewText = await getText(page, ".intake-selected-preview");
    assert.ok(
      previewText && previewText.includes(PHRASE_1),
      `Selected preview should contain phrase, got: ${previewText}`,
    );

    // ── Scenario 3: Mint selector and assert exact UTF-16/UTF-8 bounds ──
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Mint selector"),
      );
      if (btn) btn.click();
    });
    await waitForVisible(page, ".intake-selector-card");

    const cardCount = await getCount(page, ".intake-selector-card");
    assert.equal(cardCount, 1, "Should have exactly 1 selector card");

    const boundsText = await page.$eval(
      ".intake-selector-card .intake-selector-bounds",
      (el) => el.textContent,
    );
    const boundsMatch = boundsText && boundsText.match(/utf8:(\d+)\.\.(\d+)/);
    assert.ok(boundsMatch, `Bounds text should match pattern, got: ${boundsText}`);

    const actualByteStart = parseInt(boundsMatch[1], 10);
    const actualByteEnd = parseInt(boundsMatch[2], 10);

    const expectedByteStart = charToByteOffset(REPEATED_SOURCE, charStart2);
    const expectedByteEnd = expectedByteStart + new TextEncoder().encode(PHRASE_1).length;

    assert.equal(actualByteStart, expectedByteStart,
      `Byte start should be ${expectedByteStart} for 2nd occurrence, got ${actualByteStart}`);
    assert.equal(actualByteEnd, expectedByteEnd,
      `Byte end should be ${expectedByteEnd} for 2nd occurrence, got ${actualByteEnd}`);

    const charStart1 = nthIndexOf(REPEATED_SOURCE, PHRASE_1, 1);
    const firstByteStart = charToByteOffset(REPEATED_SOURCE, charStart1);
    assert.notEqual(actualByteStart, firstByteStart,
      "2nd occurrence byte start must differ from 1st occurrence");

    // ── Scenario 4: Execute Return and prove 2nd occurrence is returned ──
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Return to bytes"),
      );
      if (btn) btn.click();
    });
    await waitForVisible(page, ".intake-verification");

    const verificationClass = await getClassName(page, ".intake-verification");
    assert.ok(
      verificationClass && verificationClass.includes("is-valid"),
      "Verification should be valid for a correct selector",
    );

    const returnedQuote = await getText(page, ".intake-returned-text");
    assert.ok(
      returnedQuote && returnedQuote.includes(PHRASE_1),
      `Returned text should contain the phrase, got: ${returnedQuote}`,
    );

    // ── Scenario 5: Repeat for the 3rd occurrence ──
    const charStart3 = nthIndexOf(REPEATED_SOURCE, PHRASE_1, 3);
    const charEnd3 = charStart3 + PHRASE_1.length;
    assert.ok(charStart3 >= 0, "Third occurrence should be found");

    await setSelection(page, charStart3, charEnd3);

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Mint selector"),
      );
      if (btn) btn.click();
    });

    await waitForFunction(page, () =>
      document.querySelectorAll(".intake-selector-card").length >= 2,
    );

    const bounds3Text = await page.$$eval(
      ".intake-selector-card .intake-selector-bounds",
      (els) => els[1].textContent,
    );
    const bounds3Match = bounds3Text && bounds3Text.match(/utf8:(\d+)\.\.(\d+)/);
    assert.ok(bounds3Match, `3rd occurrence bounds should match, got: ${bounds3Text}`);

    const actual3Start = parseInt(bounds3Match[1], 10);
    const expected3Start = charToByteOffset(REPEATED_SOURCE, charStart3);
    assert.equal(actual3Start, expected3Start,
      `3rd occurrence byte start should be ${expected3Start}, got ${actual3Start}`);
    assert.notEqual(actual3Start, expectedByteStart,
      "3rd occurrence must differ from 2nd");
    assert.notEqual(actual3Start, firstByteStart,
      "3rd occurrence must differ from 1st");

    // Return the 3rd selector
    await page.$$eval(".intake-selector-card", (cards) => {
      const btns = [...cards[1].querySelectorAll("button")];
      const rtBtn = btns.find((b) => b.textContent.includes("Return to bytes"));
      if (rtBtn) rtBtn.click();
    });

    await waitForFunction(page, () => {
      const el = document.querySelector(".intake-verification");
      return el && el.classList.contains("is-valid");
    });

    const returnedQuote3 = await getText(page, ".intake-returned-text");
    assert.ok(
      returnedQuote3 && returnedQuote3.includes(PHRASE_1),
      `3rd occurrence return should contain the phrase, got: ${returnedQuote3}`,
    );

    // ── Scenario 6: Tamper — patch crypto.subtle.digest, prove Return blocked ──
    await page.reload({ waitUntil: "networkidle0" });

    const { writeFileSync: wf2 } = await import("node:fs");
    const tmpPath2 = `/tmp/intake-test-source-2-${process.pid}.txt`;
    wf2(tmpPath2, REPEATED_SOURCE, "utf-8");
    const fileInput2 = await page.$('input[type="file"]');
    await fileInput2.uploadFile(tmpPath2);
    await waitForVisible(page, ".intake-source-text");

    // Mint a selector for the 1st occurrence
    const charStart1B = nthIndexOf(REPEATED_SOURCE, PHRASE_1, 1);
    const charEnd1B = charStart1B + PHRASE_1.length;
    await setSelection(page, charStart1B, charEnd1B);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Mint selector"),
      );
      if (btn) btn.click();
    });
    await waitForVisible(page, ".intake-selector-card");

    // Tamper: patch crypto.subtle.digest to always return a hash of "tampered"
    // instead of the actual data. This causes verifiedReturn to fail because
    // the computed artifact identity won't match the selector's artifactIdentity.
    await page.evaluate(() => {
      const origDigest = crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle._origDigest = origDigest;
      crypto.subtle.digest = async (alg, _data) => {
        return origDigest(alg, new TextEncoder().encode("tampered"));
      };
    });

    // Click Return to bytes — verification should fail
    await page.evaluate(() => {
      const cards = document.querySelectorAll(".intake-selector-card");
      const btns = [...cards[0].querySelectorAll("button")];
      const rtBtn = btns.find((b) => b.textContent.includes("Return to bytes"));
      if (rtBtn) rtBtn.click();
    });

    await waitForText(page, "Return blocked", 5000);

    const blockedNotice = await getText(page, ".notice");
    assert.ok(
      blockedNotice && blockedNotice.includes("Return blocked"),
      `Expected "Return blocked" in notice, got: ${blockedNotice}`,
    );

    const blockedVerification = await getClassName(page, ".intake-verification");
    assert.ok(
      blockedVerification && blockedVerification.includes("is-invalid"),
      "Verification element should have is-invalid class after tampering",
    );

    const blockedReturnedCount = await getCount(page, ".intake-returned-text");
    assert.equal(blockedReturnedCount, 0,
      "No returned text should be displayed when Return is blocked");

    // ── Scenario 7: Upload malformed UTF-8 — source never displayed ──
    await page.reload({ waitUntil: "networkidle0" });

    const { writeFileSync: wf4 } = await import("node:fs");
    const tmpPath4 = `/tmp/intake-test-malformed-${process.pid}.txt`;
    wf4(tmpPath4, Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xff, 0xfe]));
    const fileInput4 = await page.$('input[type="file"]');
    await fileInput4.uploadFile(tmpPath4);

    await waitForText(page, "malformed UTF-8", 5000);

    const errorNotice = await getText(page, ".intake-error");
    assert.ok(
      errorNotice && errorNotice.includes("malformed UTF-8"),
      `Error should mention "malformed UTF-8", got: ${errorNotice}`,
    );

    const sourceTextCount = await getCount(page, ".intake-source-text");
    assert.equal(sourceTextCount, 0,
      "No selectable source text should be displayed for malformed UTF-8");

    const sourcePanelCount = await getCount(page, ".intake-source-panel");
    assert.equal(sourcePanelCount, 0,
      "No source panel should be rendered for malformed UTF-8");

    // ── Scenario 8: Export valid session and verify bundle properties ──
    await page.reload({ waitUntil: "networkidle0" });

    const { writeFileSync: wf5 } = await import("node:fs");
    const tmpPath5 = `/tmp/intake-test-export-${process.pid}.txt`;
    wf5(tmpPath5, REPEATED_SOURCE, "utf-8");
    const fileInput5 = await page.$('input[type="file"]');
    await fileInput5.uploadFile(tmpPath5);
    await waitForVisible(page, ".intake-source-text");

    // Mint a selector for the 2nd occurrence
    await setSelection(page, charStart2, charEnd2);
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Mint selector"),
      );
      if (btn) btn.click();
    });
    await waitForVisible(page, ".intake-selector-card");

    // Capture the exported bundle by intercepting Blob URL creation
    await page.evaluate(() => {
      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => {
        blob.text().then((text) => {
          window.__capturedBundle = text;
        });
        return origCreateObjectURL(blob);
      };
    });

    // Click export
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent && b.textContent.includes("Export session bundle"),
      );
      if (btn) btn.click();
    });

    // Wait for the bundle to be captured
    await waitForFunction(page, () => window.__capturedBundle !== undefined, 5000);
    const bundleJson = await page.evaluate(() => window.__capturedBundle);
    const bundle = JSON.parse(bundleJson);

    // canonicalIdentity: null
    assert.equal(bundle.canonicalIdentity, null,
      "Exported bundle must have canonicalIdentity: null");

    // portable_draft_unsealed
    assert.equal(bundle.status, "portable_draft_unsealed",
      `Bundle status must be "portable_draft_unsealed", got: ${bundle.status}`);

    // Exact raw artifact hash
    const { createIngestedArtifact } = await import(
      new URL("../.kernel-dist/lib/intake.js", import.meta.url)
    );
    const bytes = new TextEncoder().encode(REPEATED_SOURCE);
    const artifact = await createIngestedArtifact(bytes, {
      mediaType: "text/plain",
      originalName: "repeated.txt",
    });

    assert.equal(bundle.artifact.identity, artifact.identity,
      "Exported artifact hash must match expected SHA-256");

    // Exact selector bounds
    assert.equal(bundle.selectors.length, 1, "Bundle should have exactly 1 selector");
    const exportedSelector = bundle.selectors[0];
    assert.equal(exportedSelector.byteStart, expectedByteStart,
      `Exported selector byteStart should be ${expectedByteStart}, got ${exportedSelector.byteStart}`);
    assert.equal(exportedSelector.byteEnd, expectedByteEnd,
      `Exported selector byteEnd should be ${expectedByteEnd}, got ${exportedSelector.byteEnd}`);

    // Schema
    assert.equal(bundle.schema, "corpus-os.local-intake-session.v0",
      `Bundle schema must match, got: ${bundle.schema}`);

    // Canonical addressing blocked
    assert.equal(bundle.canonicalAddressing.status, "blocked");
    assert.equal(bundle.canonicalAddressing.dependency, "Project 0 issue #5");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
