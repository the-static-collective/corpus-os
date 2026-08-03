# Architecture

## Repository boundary

| Layer | Owns | Does not own |
|---|---|---|
| Project 0 | normative node/relationship meaning, authority and evidence boundaries, canonical-addressing decision, conformance contract | product UI, corpus-specific motif workflow |
| TranchNode | reusable append-only storage, accepted-event mechanics, deterministic traversal, portable continuity | Corpus OS views, forced Project 0 compatibility |
| Corpus OS | corpus ingestion, declared particulars, seven projections, reader branching, baseline experiment | universal ontology, a second canonicalizer, authority manufacture |

## Current slice

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

## Known fractures

1. **Original-source gap.** The three donor bundles do not contain the five original `Pasted text` inputs. Bundled exact excerpts are admitted; their cited upstream paths remain unresolved.
2. **Canonical JSON gap.** Competing donor serializers exist, but none is adopted by the shared kernel.
3. **Rejection gap.** Project 0 has a substantive `rejection` node. TranchNode v0.1 has no lossless representation.
4. **Durability gap.** Reader-created branches are local to the current browser session until append-only storage and accepted-event admission are integrated.

These are queryable system states, not prose footnotes to be forgotten.
