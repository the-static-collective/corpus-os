# Architecture

## Repository boundary

| Layer | Owns | Does not own |
|---|---|---|
| Project 0 | normative node/relationship meaning, authority and evidence boundaries, canonical-addressing decision, conformance contract | product UI, corpus-specific motif workflow |
| TranchNode | reusable append-only storage, accepted-event mechanics, deterministic traversal, portable continuity | Corpus OS views, forced Project 0 compatibility |
| Corpus OS | corpus ingestion, declared particulars, seven projections, reader branching, bounded authority/execution proof, baseline experiment | universal ontology, a second canonicalizer, authority manufacture |

## Evidence / return slice

```text
pinned donor bytes
→ admitted source artifacts
→ exact UTF-8 selectors
→ declared ring_6 particular
→ attributed claims / inferences / proposals
→ plural branches and rejection
→ exact or explicitly bounded return
→ portable draft export
→ [blocked: canonical branch identity]
```

All seven views are projections over the same `ring_6` snapshot. Selecting a different view cannot create a new canonical fact.

## Adopted warranted execution v0.1

Corpus now has one deliberately local executable authority chain:

```text
code-owned exact declaration bytes
→ adopted in-process declaration handle
→ Trust admission / refusal
→ issued in-process Action Warrant
→ Session warrant consumption
→ Session capability admission / refusal
→ bounded host execution / failure
→ launch receipt
```

The adopted root is the checked-in synthetic Casework declaration at one exact raw-byte SHA-256, trust id, and declaration version. The loader resolves the fixture from module location, hashes the bytes before JSON interpretation, applies the existing structural Trust validation, deep-freezes the declaration, and records the returned handle in a private in-process registry.

Matching representation is not authority. Spread copies, JSON round-trips, and `structuredClone` copies of either the adopted handle or an Action Warrant do not inherit private registry membership.

The host-reaching Session path accepts only a genuine issued warrant. The warrant is consumed synchronously before Session capability admission or any host await. Therefore Session refusal, host failure, and successful completion all leave the same authority spent; replay cannot produce another Session receipt or host consequence.

Lower-level capability policy remains independently testable through a pure admission evaluator. It may inspect hypothetical capability/operation/owner combinations but cannot invoke the host. The raw `CorpusSession.run(capabilityId, operation, input)` consequence shape no longer exists.

This proof establishes **which declaration cut is entitled to admit executable actions**. It does not authenticate a caller as a named participant, establish legal validity, create portable authority, or define declaration succession/revocation law.

## Exact-span law

`TextSpanSelector` contains:

- the raw artifact SHA-256 identity;
- UTF-8 byte start and exclusive byte end;
- advisory line bounds;
- SHA-256 over the selected bytes;
- bounded context hashes for migration assistance.

Verification checks artifact identity before selector bounds and selected-text identity. Line numbers never substitute for byte verification.

## Branch law

A branch cites one or more exact occurrence IDs. Creating a branch emits a new `proposal`; it never edits its roots or siblings. The browser demonstration keeps new branches in session-local state because persistence authority is not part of this slice.

`exportBranchDraft` preserves the branch and its selected roots. Its schema names the artifact a draft, sets `canonicalIdentity` to `null`, and records Project 0 #5 as the blocker. `sealBranchExport` fails closed until the adopted canonicalizer is injected through `CanonicalAddressingPort`.

## Local Intake v0.1

Local Intake is a separate `/intake` route that lets a user import one `.txt`, `.md`, or `.json` file into a browser session and exercise the kernel's exact-span law against it. It reuses the same SHA-256-over-exact-bytes hash law via the Web Crypto API — it does not invent a second serializer or identity law.

### What it does

- imports one file and computes SHA-256 over the exact uploaded bytes;
- displays the immutable source text in a read-only view;
- lets the user select an exact text span and mint a `TextSpanSelector`;
- verifies an existing selector by checking artifact identity, byte bounds, and selected-text hash;
- navigates return back to the exact selected bytes;
- exports a portable, explicitly unsealed session bundle.

### What it does not do

- it does not canonicalize semantic JSON objects;
- it does not persist, admit, or assign canonical identity;
- it does not add AI, embeddings, auth, database authority, or ontology;
- every exported object retains `canonicalIdentity: null` until Project 0 #5 is adopted.

The seven canonical views over `ring_6` are unchanged. `ring_6` remains the canonical fixture. Local Intake is additive instrumentation, not a new authority surface.

## Known fractures

1. **Original-source gap.** The three donor bundles do not contain the five original `Pasted text` inputs. Bundled exact excerpts are admitted; their cited upstream paths remain unresolved.
2. **Canonical JSON gap.** Competing donor serializers exist, but none is adopted by the shared kernel.
3. **Rejection gap.** Project 0 has a substantive `rejection` node. TranchNode v0.1 has no lossless representation.
4. **Durability gap.** Reader-created branches and executable adoption/warrant authority are process-local until append-only storage and accepted-event admission are integrated.
5. **Caller-authentication gap.** The synthetic Trust declaration distinguishes participant ids/capacities/powers, but this proof does not authenticate the external caller as that participant.
6. **Temporal-authority gap.** Declaration replacement, revocation, and succession are not defined by v0.1.
7. **Causal-reconciliation gap.** Linear Authority / Causal Accounting is deliberately deferred to Corpus OS issue #17 after this adopted consequence boundary lands.

These are queryable or explicitly bounded system states, not prose footnotes to be forgotten.
