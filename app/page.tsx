"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  branches,
  donorBundles,
  lineage,
  motifs,
  occurrences,
  primaryOccurrence,
  tensions,
  views,
  type Branch,
  type ExactOccurrence,
  type ViewId,
} from "@/lib/ring6-fixture";

const kindMark: Record<string, string> = {
  source: "Q",
  observation: "O",
  claim: "C",
  inference: "I",
  proposal: "P",
  tension: "T",
  rejection: "R",
  witness: "W",
  harvest: "H",
};

function shortHash(hash: string) {
  return `${hash.slice(0, 15)}…${hash.slice(-8)}`;
}

function SourceCard({
  occurrence,
  selected,
  onSelect,
}: {
  occurrence: ExactOccurrence;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`source-card ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      type="button"
    >
      <span className="source-card-topline">
        <span>source occurrence</span>
        <span className={`route-state ${occurrence.verification}`}>
          {occurrence.verification === "verified" ? "verified return" : "bounded return"}
        </span>
      </span>
      <span className="source-card-quote">“{occurrence.displayQuote}”</span>
      <span className="source-card-citation">
        {occurrence.sourceTitle} · line {occurrence.line}
      </span>
    </button>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewId>("motifs");
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(primaryOccurrence.id);
  const [branchOpen, setBranchOpen] = useState(false);
  const [sessionBranches, setSessionBranches] = useState<Branch[]>([]);
  const [notice, setNotice] = useState("");

  const selectedOccurrence = useMemo(
    () => occurrences.find((item) => item.id === selectedOccurrenceId) ?? primaryOccurrence,
    [selectedOccurrenceId],
  );

  function navigate(next: ViewId) {
    setView(next);
    setNotice("");
  }

  function selectOccurrence(id: string, nextView: ViewId = "source") {
    setSelectedOccurrenceId(id);
    navigate(nextView);
  }

  function addBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const thesis = String(form.get("thesis") ?? "").trim();
    const author = String(form.get("author") ?? "").trim() || "Local reader";
    if (!title || !thesis) return;

    const next: Branch = {
      id: `local_${Date.now()}`,
      title,
      thesis,
      author,
      kind: "proposal",
      relation: "derived_from",
      rootOccurrenceIds: [selectedOccurrence.id],
      validation: "proposed",
    };

    setSessionBranches((current) => [...current, next]);
    setBranchOpen(false);
    setView("branches");
    setNotice("New local branch added beside the existing readings. No prior branch was changed.");
  }

  function exportDraft(branch: Branch) {
    const exportBody = {
      schema: "corpus-os.branch-export-draft.v0",
      status: "portable_draft_unsealed",
      explicitNonClaim: "This export has no canonical JSON identity or seal authority.",
      canonicalAddressing: {
        status: "blocked",
        dependency: "Project 0 issue #5 — one adopted canonical addressing contract",
      },
      branch,
      roots: occurrences.filter((occurrence) => branch.rootOccurrenceIds.includes(occurrence.id)),
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([`${JSON.stringify(exportBody, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${branch.id}.corpus-branch-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Portable draft exported. Its raw source identities are preserved; canonical manifest identity remains explicitly blocked.");
  }

  const allBranches = [...branches, ...sessionBranches];

  return (
    <main className="corpus-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand">CORPUS OS</span>
          <span className="folio">FOLIO 000006 · α</span>
          <Link className="intake-link" href="/intake">Local Intake →</Link>
        </div>
        <nav aria-label="Corpus views" className="primary-nav">
          {views.map((item) => (
            <button
              aria-current={view === item.id ? "page" : undefined}
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="kernel-status" title="Raw byte verification is live; canonical JSON identity is not yet adopted.">
          <span className="status-dot" />
          exact bytes / seal blocked
        </div>
      </header>

      <div className="workspace">
        <aside className="motif-rail">
          <div className="rail-heading">
            <span>motif index</span>
            <span>006</span>
          </div>
          <div className="motif-list">
            {motifs.map((motif, index) => (
              <button
                className={`motif-item ${motif.id === "ring_6" ? "selected" : ""}`}
                key={motif.id}
                onClick={() => motif.id === "ring_6" && navigate("motifs")}
                type="button"
              >
                <span className="motif-index">{String(index + 1).padStart(3, "0")}</span>
                <span className="motif-name">{motif.id}</span>
                <span className="motif-counts">{motif.spans} spans · {motif.derivatives} derivatives</span>
              </button>
            ))}
          </div>
          <div className="rail-manifest">
            <span className="micro-label">input manifest</span>
            <strong>3 pinned bundles</strong>
            <span>84,069 admitted text bytes</span>
            <button onClick={() => navigate("source")} type="button">inspect sources →</button>
          </div>
        </aside>

        <section className="dossier" aria-live="polite">
          <div className="dossier-heading">
            <div>
              <p className="eyebrow">motif / 006</p>
              <h1>ring_6</h1>
            </div>
            <div className="dossier-stamp">
              <span>application profile</span>
              <strong>v0.1 proof subset</strong>
            </div>
          </div>

          <div className="metrics" aria-label="ring_6 fixture metrics">
            <div><strong>{occurrences.length}</strong><span>admitted spans</span></div>
            <div><strong>{allBranches.length}</strong><span>plural branches</span></div>
            <div><strong>{tensions.length}</strong><span>open tensions</span></div>
            <div><strong>1</strong><span>rejected proposal</span></div>
          </div>

          {notice && <div className="notice" role="status">{notice}</div>}

          {view === "motifs" && (
            <div className="view-panel motif-view">
              <div className="panel-kicker">declared particular</div>
              <blockquote>“{selectedOccurrence.displayQuote}”</blockquote>
              <div className="quote-meta">
                <span>{selectedOccurrence.sourceTitle}</span>
                <span>bytes {selectedOccurrence.byteStart}–{selectedOccurrence.byteEnd}</span>
                <span className="badge quotation">Q · quotation</span>
              </div>
              <div className="primary-actions">
                <button className="text-action" onClick={() => navigate("return")} type="button">View exact return</button>
                <button className="branch-action" onClick={() => setBranchOpen(true)} type="button">Branch from passage <span>→</span></button>
              </div>
              <div className="movement-strip" aria-label="Return-bearing movement">
                <div><span className="mark source">Q</span><strong>source occurrence</strong><p>Exact admitted bytes</p></div>
                <span className="connector">→</span>
                <div><span className="mark inference">I</span><strong>interpretation</strong><p>Attributed, not quoted</p></div>
                <span className="connector">→</span>
                <div><span className="mark return">R</span><strong>return route</strong><p>Selector verifies or fails</p></div>
              </div>
            </div>
          )}

          {view === "source" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">source view</span><h2>Original admitted material</h2></div>
                <span className="small-state">summaries never replace evidence</span>
              </div>
              <div className="source-grid">
                {occurrences.map((occurrence) => (
                  <SourceCard
                    key={occurrence.id}
                    occurrence={occurrence}
                    selected={occurrence.id === selectedOccurrence.id}
                    onSelect={() => setSelectedOccurrenceId(occurrence.id)}
                  />
                ))}
              </div>
              <div className="selector-ledger">
                <div><span>artifact</span><code>{selectedOccurrence.sourcePath}</code></div>
                <div><span>raw identity</span><code>{shortHash(selectedOccurrence.sourceHash)}</code></div>
                <div><span>selector</span><code>utf8:{selectedOccurrence.byteStart}..{selectedOccurrence.byteEnd}</code></div>
                <div><span>selected text</span><code>{shortHash(selectedOccurrence.selectedTextHash)}</code></div>
                <div><span>upstream origin</span><p>{selectedOccurrence.citedOrigin}</p></div>
              </div>
            </div>
          )}

          {view === "lineage" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">lineage view</span><h2>Movement preserves distinction</h2></div>
                <span className="small-state">{lineage.length} attributable nodes</span>
              </div>
              <div className="lineage-table">
                {lineage.map((node, index) => (
                  <button
                    className={`lineage-row ${node.status}`}
                    key={node.id}
                    onClick={() => node.occurrenceId && selectOccurrence(node.occurrenceId, "return")}
                    type="button"
                  >
                    <span className={`mark ${node.kind}`}>{kindMark[node.kind]}</span>
                    <span className="lineage-relation">{index === 0 ? "origin" : node.relation}</span>
                    <span><strong>{node.title}</strong><small>{node.body}</small></span>
                    <span className="row-status">{node.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === "return" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">return view</span><h2>Resolve or fail explicitly</h2></div>
                <span className={`route-state ${selectedOccurrence.verification}`}>{selectedOccurrence.verification.replace("_", " ")}</span>
              </div>
              <div className="return-path">
                <div className="return-step"><span>01</span><strong>Current reading</strong><p>ring_6 motif dossier</p></div>
                <span className="return-arrow">→</span>
                <div className="return-step"><span>02</span><strong>Accepted edge</strong><p>derived_from / quotation</p></div>
                <span className="return-arrow">→</span>
                <div className="return-step exact"><span>03</span><strong>Exact admitted bytes</strong><p>{selectedOccurrence.sourceTitle}</p></div>
                <span className="return-arrow muted">→</span>
                <div className={`return-step ${selectedOccurrence.verification === "verified" ? "exact" : "broken"}`}>
                  <span>04</span><strong>Cited upstream origin</strong><p>{selectedOccurrence.verification === "verified" ? "same admitted source" : "missing — traversal stops"}</p>
                </div>
              </div>
              <blockquote className="return-quote">“{selectedOccurrence.displayQuote}”</blockquote>
              <p className="return-note">{selectedOccurrence.note}</p>
              <div className="selector-ledger compact">
                <div><span>byte bounds</span><code>{selectedOccurrence.byteStart}..{selectedOccurrence.byteEnd} / {selectedOccurrence.sourceBytes}</code></div>
                <div><span>hash check</span><code>{shortHash(selectedOccurrence.selectedTextHash)}</code></div>
                <div><span>route class</span><code>quotation · {selectedOccurrence.returnHops} admitted hop</code></div>
              </div>
            </div>
          )}

          {view === "branches" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">branch view</span><h2>New readings grow beside old ones</h2></div>
                <button className="branch-action compact-button" onClick={() => setBranchOpen(true)} type="button">New branch +</button>
              </div>
              <div className="branch-list">
                {allBranches.map((branch) => (
                  <article className={`branch-card ${branch.validation}`} key={branch.id}>
                    <div className="branch-card-heading">
                      <span className={`mark ${branch.kind}`}>{kindMark[branch.kind]}</span>
                      <div><span className="micro-label">{branch.relation}</span><h3>{branch.title}</h3></div>
                      <span className="row-status">{branch.validation.replaceAll("_", " ")}</span>
                    </div>
                    <p>{branch.thesis}</p>
                    <footer><span>{branch.author}</span><button onClick={() => exportDraft(branch)} type="button">Export honest draft ↓</button></footer>
                  </article>
                ))}
              </div>
            </div>
          )}

          {view === "disagreement" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">disagreement view</span><h2>Contradiction is preserved, not averaged</h2></div>
                <span className="small-state">no winning branch chosen</span>
              </div>
              <div className="comparison">
                <article><span className="mark claim">C</span><h3>Particular agency</h3><p>The return belongs because the daughter constructed it from the inside through exact embodied anchors.</p><small>accepted as interpretation</small></article>
                <div className="versus">≠</div>
                <article><span className="mark proposal">P</span><h3>Generic recursion</h3><p>Any self-referential system can silently rewrite its own memory because return implies authority.</p><small>rejected — unsupported authority leap</small></article>
              </div>
              <div className="rejection-record">
                <span className="mark rejection">R</span>
                <div><strong>Substantive rejection remains addressable</strong><p>Corpus OS preserves this as Project 0’s <code>rejection</code> node. TranchNode v0.1 cannot represent it losslessly; the adapter boundary remains visible.</p></div>
              </div>
            </div>
          )}

          {view === "unresolved" && (
            <div className="view-panel">
              <div className="section-title-row">
                <div><span className="panel-kicker">unresolved view</span><h2>The remainder stays queryable</h2></div>
                <span className="small-state">not a defect queue</span>
              </div>
              <div className="tension-list">
                {tensions.map((tension, index) => (
                  <article key={tension.id}>
                    <span className="tension-number">{String(index + 1).padStart(2, "0")}</span>
                    <div><span className={`route-state ${tension.status}`}>{tension.status}</span><h3>{tension.title}</h3><p>{tension.detail}</p><small>{tension.basis}</small></div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="evidence-rail">
          <section>
            <div className="rail-heading"><span>lineage</span><span>013</span></div>
            <div className="mini-lineage">
              {lineage.slice(0, 4).map((node) => (
                <button key={node.id} onClick={() => node.occurrenceId ? selectOccurrence(node.occurrenceId, "return") : navigate("disagreement")} type="button">
                  <span className={`mark ${node.kind}`}>{kindMark[node.kind]}</span>
                  <span><strong>{node.title}</strong><small>{node.kind} · {node.relation}</small></span>
                </button>
              ))}
            </div>
            <button className="text-action" onClick={() => navigate("lineage")} type="button">View full lineage</button>
          </section>
          <section>
            <div className="rail-heading"><span>open tensions</span><span>014</span></div>
            <div className="mini-tensions">
              {tensions.map((tension) => (
                <button key={tension.id} onClick={() => navigate("unresolved")} type="button">
                  <span>?</span><span><strong>{tension.title}</strong><small>{tension.status}</small></span>
                </button>
              ))}
            </div>
          </section>
          <section className="bundle-register">
            <div className="rail-heading"><span>bundle register</span><span>015</span></div>
            {donorBundles.map((bundle) => (
              <div key={bundle.name}><strong>{bundle.name}</strong><code>{bundle.sha256.slice(0, 12)}…</code></div>
            ))}
          </section>
        </aside>
      </div>

      {branchOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setBranchOpen(false)}>
          <section aria-labelledby="branch-title" aria-modal="true" className="branch-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <div className="modal-heading"><div><span className="panel-kicker">branch from exact passage</span><h2 id="branch-title">Begin beside, never over</h2></div><button aria-label="Close branch composer" onClick={() => setBranchOpen(false)} type="button">×</button></div>
            <blockquote>“{selectedOccurrence.displayQuote}”</blockquote>
            <p className="modal-selector">Pinned selector · utf8:{selectedOccurrence.byteStart}..{selectedOccurrence.byteEnd} · {shortHash(selectedOccurrence.selectedTextHash)}</p>
            <form onSubmit={addBranch}>
              <label>Branch title<input autoFocus name="title" placeholder="Name this reading" required /></label>
              <label>Attributable author<input name="author" placeholder="Local reader" /></label>
              <label>Reading<textarea name="thesis" placeholder="What emerges from this exact passage?" required rows={5} /></label>
              <div className="modal-actions"><button className="text-action" onClick={() => setBranchOpen(false)} type="button">Cancel</button><button className="branch-action" type="submit">Create proposed branch →</button></div>
            </form>
            <p className="modal-boundary">This creates a local <code>proposal</code>. It does not mutate the source, admit an edge, or manufacture authority.</p>
          </section>
        </div>
      )}
    </main>
  );
}
