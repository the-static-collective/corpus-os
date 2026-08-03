# Corpus OS

**An operating system for ideas with identity, ancestry, scars, and return paths.**

Corpus OS is the first falsifiable downstream proof of the Project 0 / TranchNode architecture. It does not summarize a corpus and call the summary memory. It preserves admitted source bytes, declared particulars, attributed transformations, plural readings, explicit disagreement, and routes back to evidence.

The first proof particular is `ring_6`.

## What works now

- eight donor artifacts are pinned and verified by exact SHA-256 identity;
- four `ring_6` spans use UTF-8 byte selectors and selected-text hashes;
- Source, Motif, Lineage, Return, Branch, Disagreement, and Unresolved are projections over one fixture;
- quotations, claims, inferences, proposals, tensions, and rejection remain mechanically distinct;
- two accepted readings survive beside one rejected proposal;
- exact return either resolves or reports the missing upstream artifact;
- a reader can create a local proposed branch without mutating source or prior branches;
- branch drafts export roots and raw identities while explicitly refusing a false canonical seal;
- adversarial tests defend corrupted spans, artifact substitution, plural branches, deterministic ordering, and the canonical-addressing stop condition.

## The honest boundary

This is a **v0.1 proof subset**, not full conformance.

Project 0 issue #5 has not yet adopted the ecosystem's one canonical JSON addressing implementation. Corpus OS therefore verifies raw artifact bytes, but `sealBranchExport` fails closed unless an adopted `CanonicalAddressingPort` is supplied. It does not borrow a donor serializer and quietly create a third identity law.

The original five `Pasted text` files are also absent from the three pinned donor bundles. Where the Latent Design Grammar cites them, Corpus OS returns exactly to the admitted curated-evidence bytes and exposes the unavailable upstream hop.

## Run it

Requires Node 22 or newer.

```bash
npm install
npm run check
npm run dev
```

Useful focused commands:

```bash
npm run verify:corpus
npm run test:kernel
npm run build
```

## Repository map

- `app/` — the seven-view navigation instrument and local branch composer.
- `kernel/` — exact-span verification, deterministic queries, branch draft export, and the canonical-addressing port.
- `corpus/manifest.json` — pinned input policy, hashes, admitted artifacts, and declared absences.
- `corpus/sources/` — exact text artifacts extracted from the pinned donor bundles.
- `lib/ring6-fixture.ts` — typed `ring_6` proof data.
- `tests/kernel.test.mjs` — adversarial continuity tests.
- `docs/architecture.md` — application and authority boundaries.
- `docs/profile-matrix.md` — Project 0 / TranchNode compatibility matrix.
- `docs/baseline-experiment.md` — reproducible comparison against Git + Markdown + search.

## Governing rule

> Machines propose. Validators judge. The archive records. Originals remain untouched.

Confidence is not evidence. Hashing is not truth. Retrieval is not authority. Similarity is not lineage.
