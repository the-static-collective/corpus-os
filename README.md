# Corpus OS

**An operating environment for bodies of evidence, ideas, authority, action, and return.**

Corpus OS is the first falsifiable downstream proof of the Project 0 / TranchNode architecture. It does not summarize a corpus and call the summary memory. It preserves admitted source bytes, declared particulars, attributed transformations, plural readings, explicit disagreement, bounded execution, refusal, and routes back to evidence.

The original proof particular is `ring_6`. The system now also has two executable operating-environment layers:

- **Corpus Session** — open a session, discover a declared capability, admit or refuse an operation, execute only through the capability owner, and return a deterministic receipt;
- **Corpus Trust Runtime** — evaluate who is acting, in what declared capacity, under which power, against which constituted corpus, with explicit admission or refusal.

The first major product vertical growing from those laws is **Corpus Casework**:

> challengeable evidence → plural interpretation → bounded action → accounting → exact return

## What works now

### Evidence and return

- eight donor artifacts are pinned and verified by exact SHA-256 identity;
- four `ring_6` spans use UTF-8 byte selectors and selected-text hashes;
- Source, Motif, Lineage, Return, Branch, Disagreement, and Unresolved are projections over one fixture;
- quotations, claims, inferences, proposals, tensions, and rejection remain mechanically distinct;
- two accepted readings survive beside one rejected proposal;
- exact return either resolves or reports the missing upstream artifact;
- a reader can create a local proposed branch without mutating source or prior branches;
- branch drafts export roots and raw identities while explicitly refusing a false canonical seal.

### Session execution

- a bounded capability registry declares what a capability may execute and what it may never claim as authority;
- `corpus:session` proves open → capability → admitted execution → explicit refusal;
- execution remains owned by the declared runtime rather than being absorbed into Corpus authority;
- non-authority operations fail closed and return deterministic receipts;
- session behavior is covered by executable tests in the main check gate.

### Trust-shaped administration

- a pure deterministic Trust Runtime separates participant identity, acting capacity, granted power, target scope, and delegated capability;
- the synthetic Casework declaration constitutes a bounded corpus with administrator, beneficiary, reviewer, and externally owned transcription capability;
- source removal, declaration amendment, undeclared capacity, foreign corpus targets, unknown capabilities, and capability attempts to manufacture factual authority fail closed;
- every declaration and decision in this proof carries `legalValidity: "unclaimed"`;
- `test:session` and `test:trust` run together so policy and execution can evolve without collapsing into one architecture.

## The architecture now

```text
admitted source / declared corpus
        ↓
identity + exact return
        ↓
plural interpretation / disagreement
        ↓
declared actor + capacity + power
        ↓
Trust Runtime admission / refusal
        ↓
Corpus capability registry
        ↓
owned execution
        ↓
launch / administration receipts
        ↓
return to evidence and history
```

The Trust Runtime and Session Runtime are currently separate executable layers. Their intended composition is explicit, but Corpus does not yet pretend that the full Casework loop is integrated end to end.

## The honest boundary

This is still a **v0.1 proof subset**, not full ecosystem conformance and not a jurisdiction-specific legal engine.

Project 0 issue #5 has not yet adopted the ecosystem's one canonical JSON addressing implementation. Corpus OS therefore verifies raw artifact bytes, but `sealBranchExport` fails closed unless an adopted `CanonicalAddressingPort` is supplied. It does not borrow a donor serializer and quietly create a third identity law.

The original five `Pasted text` files are also absent from the three pinned donor bundles. Where the Latent Design Grammar cites them, Corpus OS returns exactly to the admitted curated-evidence bytes and exposes the unavailable upstream hop.

The Trust Runtime is structural and computational. It does **not** determine or claim trust formation, title, beneficial ownership, fiduciary duty, tax treatment, legal capacity, conveyance, enforceability, or any other jurisdiction-specific legal conclusion. Corpus can administer a declared structure without asserting that civil law recognizes it.

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
npm run test:session
npm run test:trust
npm run corpus:session
npm run build
```

## Repository map

- `app/` — the seven-view navigation instrument and local branch composer.
- `kernel/` — exact-span verification, deterministic queries, branch draft export, and the canonical-addressing port.
- `runtime/` — bounded session capability and execution mediation.
- `lib/trust-runtime.ts` — deterministic trust-shaped admission/refusal evaluator.
- `fixtures/session/` — synthetic capability fixture for the minimum session proof.
- `fixtures/trusts/` — synthetic constituted-corpus declaration for Casework.
- `corpus/manifest.json` — pinned input policy, hashes, admitted artifacts, and declared absences.
- `corpus/sources/` — exact text artifacts extracted from the pinned donor bundles.
- `lib/ring6-fixture.ts` — typed `ring_6` proof data.
- `tests/` — adversarial continuity, session, trust, intake, browser, and rendered-output tests.
- `docs/architecture.md` — application and authority boundaries.
- `docs/corpus-trust-runtime-v0.1.md` — Trust Runtime laws, Casework vertical, non-goals, and follow-on horizon.
- `docs/profile-matrix.md` — Project 0 / TranchNode compatibility matrix.
- `docs/baseline-experiment.md` — reproducible comparison against Git + Markdown + search.

## Current direction: Corpus Casework

The next meaningful vertical is not generic document management. It is a challengeable evidence environment where source material, competing interpretations, declared authority, delegated tools, refusals, and administrative history remain distinguishable and returnable.

The intended loop is:

```text
Open Case
  ↓
inspect admitted evidence
  ↓
create or inspect claims / interpretations
  ↓
return to exact evidence
  ↓
fork a competing interpretation
  ↓
invoke declared tools under bounded authority
  ↓
accept / reject / challenge derived proposals
  ↓
produce an accountable result
  ↓
return every material assertion to evidence and administration history
```

The differentiator is continuity across:

**evidence → interpretation → authority → action → disagreement → accounting → return**

## Governing rules

> Machines propose. Validators judge. The archive records. Originals remain untouched.

> No conclusion may become easier to reach than its evidence is to recover.

Confidence is not evidence. Hashing is not truth. Retrieval is not authority. Similarity is not lineage. Execution is not authority. Possession is not truth.
