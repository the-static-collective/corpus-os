"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import Link from "next/link";

import {
  createIngestedArtifact,
  createIntakeSelector,
  decodeFatalUtf8,
  detectMediaType,
  exportSessionBundle,
  isAllowedFile,
  verifiedReturn,
  type ArtifactRef,
  type SelectorVerification,
  type TextSpanSelector,
} from "@/lib/intake";

function shortHash(hash: string) {
  return `${hash.slice(0, 15)}…${hash.slice(-8)}`;
}

/**
 * Derive exact UTF-16 character offsets from a DOM Range within the source
 * <pre> element. We insert boundary markers at the range start/end, then
 * locate the markers in the full text content. This avoids String.indexOf
 * and correctly distinguishes identical occurrences.
 */
function getCharacterOffsets(
  container: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  const START_MARKER = "\uFDD0";
  const END_MARKER = "\uFDD1";

  const doc = container.ownerDocument;
  if (!doc) return null;

  const startRange = range.cloneRange();
  const endRange = range.cloneRange();

  startRange.collapse(true);
  endRange.collapse(false);

  const startMarker = doc.createTextNode(START_MARKER);
  const endMarker = doc.createTextNode(END_MARKER);

  try {
    startRange.insertNode(startMarker);
    endRange.insertNode(endMarker);
  } catch {
    return null;
  }

  const fullText = container.textContent ?? "";

  const start = fullText.indexOf(START_MARKER);
  const end = fullText.indexOf(END_MARKER);

  // Clean up markers
  const parent = startMarker.parentNode;
  if (parent) {
    parent.removeChild(startMarker);
  }
  const endParent = endMarker.parentNode;
  if (endParent) {
    endParent.removeChild(endMarker);
  }

  if (start < 0 || end < 0 || end <= start) return null;
  return { start, end };
}

export default function IntakePage() {
  const [artifact, setArtifact] = useState<ArtifactRef | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [selectors, setSelectors] = useState<TextSpanSelector[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [charBounds, setCharBounds] = useState<{ start: number; end: number } | null>(null);
  const [activeSelectorIndex, setActiveSelectorIndex] = useState<number | null>(null);
  const [verification, setVerification] = useState<SelectorVerification | null>(null);
  const [returnedText, setReturnedText] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceDisplayRef = useRef<HTMLPreElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setNotice("");
    setSelectors([]);
    setSelectedText("");
    setCharBounds(null);
    setActiveSelectorIndex(null);
    setVerification(null);
    setReturnedText("");

    if (!isAllowedFile(file.name)) {
      setError("Only .txt, .md, and .json files are accepted.");
      return;
    }

    const mediaType = detectMediaType(file.name);
    if (!mediaType) {
      setError("Could not determine media type.");
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Fatal UTF-8 decoding: reject malformed bytes before presenting as text
    const text = decodeFatalUtf8(bytes);
    if (text === null) {
      setError(
        `File "${file.name}" contains malformed UTF-8. Raw-byte hash was computed, but ` +
        `malformed bytes cannot be represented as a faithful immutable text source. ` +
        `Fix the encoding and re-import.`,
      );
      return;
    }

    const ref = await createIngestedArtifact(bytes, {
      mediaType,
      originalName: file.name,
    });

    setArtifact(ref);
    setSourceText(text);
    setSourceBytes(bytes);
    setFileName(file.name);
    setNotice(
      `Imported "${file.name}" — ${bytes.byteLength} bytes, identity ${shortHash(ref.identity)}. ` +
      `Source is immutable in this session. No admission authority is claimed.`,
    );
  }, []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onSourceSelect = () => {
    const el = sourceDisplayRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelectedText("");
      setCharBounds(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const bounds = getCharacterOffsets(el, range);
    if (!bounds) {
      setSelectedText("");
      setCharBounds(null);
      return;
    }

    const text = sourceText.slice(bounds.start, bounds.end);
    if (text.length > 0) {
      setSelectedText(text);
      setCharBounds(bounds);
    } else {
      setSelectedText("");
      setCharBounds(null);
    }
  };

  const mintSelector = async () => {
    if (!artifact || !selectedText || !charBounds || !sourceBytes) return;
    setError("");
    try {
      const selector = await createIntakeSelector(
        artifact,
        sourceText,
        charBounds.start,
        charBounds.end,
      );
      const verify = await verifiedReturn(sourceBytes, selector);
      setSelectors((prev) => [...prev, selector]);
      setVerification(
        verify.valid
          ? { valid: true, code: "verified", extractedBytes: verify.extractedBytes }
          : { valid: false, code: verify.code },
      );
      setActiveSelectorIndex(selectors.length);
      setSelectedText("");
      setCharBounds(null);
      window.getSelection()?.removeAllRanges();
      setNotice(
        `Selector minted and verified: utf8:${selector.byteStart}..${selector.byteEnd}, ` +
        `${shortHash(selector.selectedTextHash)}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mint selector.");
    }
  };

  const verifyExisting = async (selector: TextSpanSelector, index: number) => {
    if (!sourceBytes) return;
    const result = await verifiedReturn(sourceBytes, selector);
    setVerification(
      result.valid
        ? { valid: true, code: "verified", extractedBytes: result.extractedBytes }
        : { valid: false, code: result.code },
    );
    setActiveSelectorIndex(index);
    if (result.valid && result.extractedBytes) {
      setReturnedText(new TextDecoder("utf-8").decode(result.extractedBytes));
      setNotice(`Selector ${index + 1} verified. Returned to exact bytes.`);
    } else {
      setReturnedText("");
      setNotice(`Selector ${index + 1} failed verification: ${result.code.replace(/_/g, " ")}.`);
    }
  };

  const returnToSelectedBytes = async (selector: TextSpanSelector, index: number) => {
    if (!sourceBytes) return;
    // Safe Return: verify artifact identity, bounds, and selected-text hash
    // before displaying returned content. Never present an unverified selector
    // as successfully returned.
    const result = await verifiedReturn(sourceBytes, selector);
    setActiveSelectorIndex(index);
    if (result.valid && result.extractedBytes) {
      setReturnedText(new TextDecoder("utf-8").decode(result.extractedBytes));
      setVerification({ valid: true, code: "verified", extractedBytes: result.extractedBytes });
      setNotice(`Returned to bytes ${selector.byteStart}..${selector.byteEnd} (verified).`);
    } else {
      setReturnedText("");
      setVerification({ valid: false, code: result.code });
      setNotice(
        `Return blocked — selector ${index + 1} failed verification: ` +
        `${result.code.replace(/_/g, " ")}. Content not displayed.`,
      );
    }
  };

  const exportBundle = () => {
    if (!artifact || !sourceBytes) return;
    const bundle = exportSessionBundle(artifact, selectors, sourceBytes);
    const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName}.intake-session.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(
      "Session bundle exported. canonicalIdentity is explicitly null — no seal authority claimed.",
    );
  };

  return (
    <main className="corpus-shell intake-shell">
      <header className="topbar intake-topbar">
        <div className="brand-block">
          <Link className="intake-back" href="/">← Corpus OS</Link>
          <span className="brand">LOCAL INTAKE</span>
          <span className="folio">v0.1 · unsealed</span>
        </div>
        <div className="kernel-status" title="Local intake reuses the kernel SHA-256 hash law. No canonical JSON identity, no persistence, no admission authority.">
          <span className="status-dot" />
          exact bytes / no authority
        </div>
      </header>

      <div className="intake-workspace">
        <section className="intake-upload-panel">
          <div className="section-title-row">
            <div>
              <span className="panel-kicker">step 01 · import</span>
              <h2>Import one source file</h2>
            </div>
            <span className="small-state">.txt · .md · .json</span>
          </div>

          <label className="intake-dropzone">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json"
              onChange={onFileChange}
              className="intake-file-input"
            />
            <span className="intake-dropzone-prompt">
              {fileName ? (
                <>File imported: <strong>{fileName}</strong></>
              ) : (
                "Choose a .txt, .md, or .json file to import into this session"
              )}
            </span>
          </label>

          {error && <div className="notice intake-error" role="alert">{error}</div>}
          {notice && <div className="notice" role="status">{notice}</div>}

          {artifact && (
            <div className="selector-ledger">
              <div><span>media type</span><code>{artifact.mediaType}</code></div>
              <div><span>raw identity</span><code>{shortHash(artifact.identity)}</code></div>
              <div><span>byte length</span><code>{artifact.byteLength}</code></div>
              <div><span>original name</span><code>{artifact.originalName}</code></div>
            </div>
          )}
        </section>

        {artifact && sourceText && (
          <>
            <section className="intake-source-panel">
              <div className="section-title-row">
                <div>
                  <span className="panel-kicker">step 02 · immutable source</span>
                  <h2>View and select exact text</h2>
                </div>
                <span className="small-state">{sourceText.length} characters</span>
              </div>

              <pre
                ref={sourceDisplayRef}
                className="intake-source-text"
                onMouseUp={onSourceSelect}
                aria-label="Source text — select a span to mint a selector"
              >
                {sourceText}
              </pre>

              <div className="intake-select-actions">
                <span className="intake-selected-preview">
                  {selectedText
                    ? `Selected: "${selectedText.length > 60 ? selectedText.slice(0, 60) + "…" : selectedText}"`
                    : "Select text in the source above, then mint a selector"}
                </span>
                <button
                  className="branch-action compact-button"
                  disabled={!selectedText}
                  onClick={mintSelector}
                  type="button"
                >
                  Mint selector →
                </button>
              </div>
            </section>

            <section className="intake-selector-panel">
              <div className="section-title-row">
                <div>
                  <span className="panel-kicker">step 03 · selectors</span>
                  <h2>Minted and verified spans</h2>
                </div>
                <button
                  className="intake-export-button"
                  disabled={selectors.length === 0}
                  onClick={exportBundle}
                  type="button"
                >
                  Export session bundle ↓
                </button>
              </div>

              {selectors.length === 0 ? (
                <p className="intake-empty">No selectors yet. Select text in the source and mint one.</p>
              ) : (
                <div className="intake-selector-list">
                  {selectors.map((selector, index) => (
                    <article
                      key={index}
                      className={`intake-selector-card ${activeSelectorIndex === index ? "is-active" : ""}`}
                    >
                      <div className="intake-selector-header">
                        <span className="intake-selector-number">{String(index + 1).padStart(2, "0")}</span>
                        <code className="intake-selector-bounds">utf8:{selector.byteStart}..{selector.byteEnd}</code>
                        <code className="intake-selector-hash">{shortHash(selector.selectedTextHash)}</code>
                      </div>
                      <div className="intake-selector-meta">
                        <span>line {selector.lineStart}–{selector.lineEnd}</span>
                        <span>{shortHash(selector.artifactIdentity)}</span>
                      </div>
                      <div className="intake-selector-actions">
                        <button onClick={() => verifyExisting(selector, index)} type="button">Verify</button>
                        <button onClick={() => returnToSelectedBytes(selector, index)} type="button">Return to bytes</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {verification && (
                <div className={`intake-verification ${verification.valid ? "is-valid" : "is-invalid"}`}>
                  <span className={`route-state ${verification.valid ? "verified" : "origin_missing"}`}>
                    {verification.code.replace(/_/g, " ")}
                  </span>
                  {verification.valid && returnedText && (
                    <blockquote className="intake-returned-text">&ldquo;{returnedText.length > 200 ? returnedText.slice(0, 200) + "…" : returnedText}&rdquo;</blockquote>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <footer className="intake-footer">
        <p>
          Local Intake v0.1 computes SHA-256 over exact uploaded bytes using the existing kernel hash law.
          No canonical JSON identity is assigned — <code>canonicalIdentity</code> is <code>null</code> until Project 0 #5 is adopted.
          Session bundles are explicitly unsealed portable drafts, not admitted artifacts.
        </p>
      </footer>
    </main>
  );
}
