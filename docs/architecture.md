# Architecture

## Repository boundary

| Layer | Owns | Does not own |
|---|---|---|
| Project 0 | normative node/relationship meaning, authority and evidence boundaries, canonical-addressing decision, conformance contract | product UI, corpus-specific motif workflow |
| TranchNode | reusable append-only storage, accepted-event mechanics, deterministic traversal, portable continuity | Corpus OS views, forced Project 0 compatibility |
| Corpus OS | corpus ingestion, declared particulars, seven projections, reader branching, bounded authority/execution proof, causal reconciliation, lawful-reachability projection, baseline experiment | universal ontology, a second canonicalizer, authority manufacture |

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

Corpus has one deliberately local executable authority chain:

```text
code-owned exact declaration bytes
→ adopted in-process declaration handle
→ Trust admission / refusal
→ issued in-process Action Warrant
→ Session warrant consumption
→ Session capability admission / refusal
→ bounded host execution / failure
→ terminal launch receipt
```

The adopted root is the checked-in synthetic Casework declaration at one exact raw-byte SHA-256, trust id, and declaration version. The loader resolves the fixture from module location, hashes the bytes before JSON interpretation, applies the existing structural Trust validation, deep-freezes the declaration, and records the returned handle in a private in-process registry.

Matching representation is not authority. Spread copies, JSON round-trips, and `structuredClone` copies of either the adopted handle or an Action Warrant do not inherit private registry membership.

The host-reaching Session path accepts only a genuine issued warrant. The warrant is consumed synchronously before Session capability admission or any host await. Therefore Session refusal, host failure, and successful completion all leave the same authority spent; replay cannot produce another Session receipt or host consequence.

Every terminal receipt produced by the warrant-consuming Session path also carries `causalBinding`, a read-only evidence shape copied from the already-consumed genuine warrant: trust id, authority cut, corpus subject, capability id/operation/owner, Trust request id, and exact operation input. This binding is inspectable evidence only. It is not registered as authority and cannot be executed. The lower-level pure admission evaluator may still construct hypothetical refusal evidence for policy testing; that does not become causal history unless it reconciles to a genuine spent warrant.

Lower-level capability policy remains independently testable through a pure admission evaluator. It may inspect hypothetical capability/operation/owner combinations but cannot invoke the host. The raw `CorpusSession.run(capabilityId, operation, input)` consequence shape no longer exists.

This proof establishes **which declaration cut is entitled to admit executable actions**. It does not authenticate a caller as a named participant, establish legal validity, create portable authority, or define declaration succession/revocation law.

## Causal accounting / linear authority v0.1

`runtime/causal-accounting.ts` is a pure derived view over genuine issued Action Warrants plus terminal launch receipts. It does not create a second event store, persist history, mint ids, canonicalize JSON, sign evidence, repair anomalies, or produce executable authority.

The governing separation is:

```text
warrant resource state
  unspent | spent

is not the same thing as

terminal causal history
  unspent | session-refused | host-failed | completed
```

`inspectActionWarrantState(...)` exposes only whether a genuine issued warrant is still available or has been consumed. `reconcileCausalHistory(...)` then combines that resource state with supplied terminal attempt evidence and preserves the actual disposition.

A balanced cut therefore has this form:

```text
adopted declaration cut
→ genuine issued warrant
→ zero attempts while unspent
     = unspent
  OR
→ exactly one spent attempt
     → Session refusal = session-refused
     → admitted host failure = host-failed
     → admitted host completion = completed
```

Pre-warrant refusal remains outside executable causal history: no Action Warrant is issued, Session is not entered, and no host consequence or Session receipt is created by that request.

The reconciler detects or represents these computational-integrity anomalies without repairing them:

- `ORPHAN_EFFECT` — consequence evidence lacks an attributable genuine spent warrant in the reconciliation cut;
- `DOUBLE_SPEND` — more than one terminal consequence is attributed to one genuine warrant;
- `SUBSTITUTED_CONSEQUENCE` — receipt-bound subject/capability/operation/owner/request/input or admitted terminal fields do not match the warrant;
- `BROKEN_LINEAGE` — receipt causal lineage names a different trust or authority cut;
- `MISSING_DISPOSITION` — a genuine warrant is already spent but no terminal attempt evidence is present.

A replay refused as `ACTION_WARRANT_ALREADY_CONSUMED` is not itself a second consequence and therefore does not make otherwise complete causal history unbalanced. Deliberately supplied evidence of two terminal receipts for the same warrant does.

The reconciliation result freezes only newly derived entries and arrays. It does not mutate the adopted declaration, warrant objects, launch receipts, or caller-provided ordering.

These anomaly names make no legal-validity, fraud, financial-accounting, or jurisdiction-specific claim. The proof is local to evidence presented to this in-process Corpus consequence boundary; it does not prove that no similar act occurred elsewhere.

## Lawful Reachability / Constituted Reality v0.1

`runtime/world-cut.ts` is a read-only projection downstream of Causal Accounting. Corpus distinguishes observed substrate from constituted state rather than assuming that every observed ref automatically belongs to the present world.

The projection boundary is deliberately narrower than the Causal Accounting object. `reachabilityRecordsFromReconciliation(...)` copies the root/cause fields and terminal disposition needed for reachability, but executable warrant objects, launch receipt objects, capability-owner authority, and operation input do not cross into `deriveWorldCut(...)`.

Conceptually:

```text
adopted root
→ balanced causal history under the exact trust + authority cut
→ deriveWorldCut(...)
→ constituted refs + preserved terminal history
  OR explicit unresolved/orphan state
```

A balanced `completed` record may add only its declared consequence output refs to constituted state. A balanced `host-failed` or `session-refused` record advances terminal history but manufactures no successful output. `unspent` evidence is not a consequential transition.

The `terminalHistory` field is load-bearing: Session refusal after spend, host failure, and completion remain distinguishable rather than collapsing back into one generic `spent` state.

Observations are handled separately from causal closure:

```text
observed + accountable ancestry = constituted or already-supported observation
observed - accountable ancestry = ORPHAN_OBSERVATION
```

`ORPHAN_OBSERVATION` means only that the supplied history does not establish how the ref entered this constituted world. It does not classify the observation as false, hostile, fraudulent, corrupt, or deletable.

Causal Accounting anomalies remain non-constituting. Every available anomaly code, including `MISSING_DISPOSITION`, is preserved as explicit `UNRESOLVED` projection evidence. A record naming another trust or authority cut is classified as broken lineage for this root and cannot bridge worlds.

The projection is deterministic structural data: ref arrays and derived records use stable lexical ordering, returned projection objects/arrays are frozen, and supplied evidence is not mutated. Structural re-derivation from the same admitted inputs is the v0.1 re-entry claim; no canonical world hash or portable world identity is introduced.

The bounded claim is:

> Unauthorized substrate mutation need not automatically redefine constituted state.

The projection grants no authority, issues or consumes no warrants, reaches no Session or host, persists nothing, repairs nothing, schedules nothing, authenticates no arbitrary persisted history, and carries `legalValidity: "unclaimed"`. It makes no legal-validity, distributed-consensus, cryptographic-attestation, or external-world-exclusivity claim.

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
4. **Durability gap.** Reader-created branches, executable adoption/warrant authority, causal reconciliation, and constituted-world projection are process-local until append-only storage and accepted-event admission are integrated.
5. **Caller-authentication gap.** The synthetic Trust declaration distinguishes participant ids/capacities/powers, but this proof does not authenticate the external caller as that participant.
6. **Temporal-authority gap.** Declaration replacement, revocation, and succession are not defined by v0.1.
7. **Persisted-history authenticity gap.** `WorldCut` derives only from supplied accountable evidence; Corpus does not yet authenticate arbitrary persisted history or prove that an external substrate has not been changed outside this boundary.

These are queryable or explicitly bounded system states, not prose footnotes to be forgotten.
