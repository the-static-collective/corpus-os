"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import Link from "next/link";

import {
  createIngestedArtifact,
  createIntakeSelector,
  detectMediaType,
  exportSessionBundle,
  isAllowedFile,
  returnToBytes,
  verifyIntakeSelector,
  type ArtifactRef,
  type SelectorVerification,
  type TextSpanSelector,
} from "@/lib/intake";

function shortHash(hash: string) {
  return `${hash.slice(0, 15)}…${hash.slice(-8)}`;
}

export default function IntakePage() {
  const [artifact, setArtifact] = useState<ArtifactRef | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [selectors, setSelectors] = useState<TextSpanSelector[]>([]);
  const [selectedText, setSelectedText] = useState("");
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
    const text = new TextDecoder("utf-8").decode(bytes);

    const ref = await createIngestedArtifact(bytes, {
      mediaType,
      originalName: file.name,
    });

    setArtifact(ref);
    setSourceText(text);
    setSourceBytes(bytes);
    setFileName(file.name);
    setNotice(`Admitted "${file.name}" — ${bytes.byteLength} bytes, identity ${shortHash(ref.identity)}. Source is immutable in this session.`);
  }, []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onSourceSelect = () => {
    const el = sourceDisplayRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText("");
      return;
    }
    const text = selection.toString();
    if (text && sourceText.includes(text)) {
      setSelectedText(text);
    }
  };

  const mintSelector = async () => {
    if (!artifact || !selectedText) return;
    setError("");
    try {
      const selector = await createIntakeSelector(artifact, sourceText, selectedText);
      const verify = await verifyIntakeSelector(sourceBytes!, selector);
      setSelectors((prev) => [...prev, selector]);
      setVerification(verify);
      setActiveSelectorIndex(selectors.length);
      setSelectedText("");
      window.getSelection()?.removeAllRanges();
      setNotice(`Selector minted and verified: utf8:${selector.byteStart}..${selector.byteEnd}, ${shortHash(selector.selectedTextHash)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mint selector.");
    }
  };

  const verifyExisting = async (selector: TextSpanSelector, index: number) => {
    if (!sourceBytes) return;
    const result = await verifyIntakeSelector(sourceBytes, selector);
    setVerification(result);
    setActiveSelectorIndex(index);
    if (result.valid && result.extractedBytes) {
      setReturnedText(new TextDecoder("utf-8").decode(result.extractedBytes));
      setNotice(`Selector ${index + 1} verified. Returned to exact bytes.`);
    } else {
      setReturnedText("");
      setNotice(`Selector ${index + 1} failed: ${result.code.replace(/_/g, " ")}.`);
    }
  };

  const returnToSelectedBytes = (selector: TextSpanSelector, index: number) => {
    if (!sourceBytes) return;
    const bytes = returnToBytes(sourceBytes, selector);
    setReturnedText(new TextDecoder("utf-8").decode(bytes));
    setActiveSelectorIndex(index);
    setNotice(`Returned to bytes ${selector.byteStart}..${selector.byteEnd}.`);
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
    setNotice("Session bundle exported. canonicalIdentity is explicitly null — no seal authority claimed.");
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
              <h2>Admit one source file</h2>
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
                <>File admitted: <strong>{fileName}</strong></>
              ) : (
                "Choose a .txt, .md, or .json file to admit into this session"
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
                    <blockquote className="intake-returned-text">"{returnedText.length > 200 ? returnedText.slice(0, 200) + "…" : returnedText}"</blockquote>
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
