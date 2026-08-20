# Corpus Continuity Attestation v0.1 — Implementation Plan

**Goal:** Prove one Corpus-local, deterministic, frozen continuity attestation between two already-derived WorldCuts without transferring authority or duplicating Lawful Reachability.

**Architecture:** `deriveCorpusContinuityAttestation(...)` compares only `WorldCut.constitutedRefs`, requires explicit transition evidence before classifying transformed/lost refs, preserves each cut's terminal/unresolved/orphan evidence, exposes authority-cut change explicitly, and keeps authority continuity as inert separately evidenced metadata.

**Tech:** TypeScript runtime compiled by `tsconfig.kernel.json`; Node 22 `node:test`; existing `npm run check` gate.

## Constraints

- Do not modify `runtime/world-cut.ts` semantics.
- No Project0 dependency or adapter in this PR.
- No warrant objects in attestation input/output.
- No call to `consumeIssuedActionWarrant`, `launchCapability`, Session, or host ports.
- No canonical global continuity/attestation hash.
- No inferred transformed/lost meaning from names/prose.
- Keep `legalValidity: "unclaimed"`.

## Task 1 — RED contract

Create `tests/continuity-attestation.test.mjs` before production code.

The suite must derive prior/current WorldCuts with `deriveWorldCut(...)` and then expect:

- deterministic frozen attestation;
- exact preserved/transformed/lost/unresolved classification;
- prior refusal and current host failure retained;
- matching orphan observation excluded from preservation;
- authority-cut change explicit;
- separately-evidenced authority inert;
- unexplained difference unresolved rather than lost;
- malformed/ambiguous transition evidence refused;
- accessor-backed transition/authority evidence arrays refused without accessor execution;
- JSON/spread/structuredClone output contains data only.

Add `test:continuity` to `package.json` and the repository `check` chain so Actions executes the new test.

Open a draft PR and record RED. Expected failure: missing `.kernel-dist/runtime/continuity-attestation.js` / module not executable. Existing tests should remain green up to that boundary.

## Task 2 — GREEN minimum implementation

Create `runtime/continuity-attestation.ts` only after RED is witnessed.

Implement:

- strict plain-array string validation without executing accessors;
- trust match check;
- exact prior/current constituted set comparison;
- one transition edge per prior-only ref;
- strict transformed edge: prior-only -> current-only;
- strict lost edge: prior-only only;
- unexplained symmetric differences -> `unresolvedRefs`;
- immutable copies of terminal history, unresolved, and orphan observations;
- explicit authority-cut change;
- `authorityContinuity` metadata with non-empty evidence required for `separately-evidenced`;
- frozen output with `legalValidity: "unclaimed"`.

Run `npm run check` through GitHub Actions and record exact-head result.

## Task 3 — Boundary review / hardening

Review exact diff for:

- any call into warrant consumption, Session, launch, host, persistence, or mutation;
- any transition classification controlled by prose or string similarity;
- orphan observations accidentally entering preserved refs;
- copied warrant-shaped representation acquiring meaning;
- authority-cut change being hidden;
- sparse/accessor caller representations executing during validation;
- mutation or reference leakage from either WorldCut;
- duplicate identity/canonicalization machinery.

Any valid finding gets RED regression first, then minimum fix.

## Task 4 — Ready gate

Update PR body with:

- base and exact head;
- RED/GREEN run IDs;
- final test count;
- changed-file list;
- exact first specimen classification;
- boundary statement: witness not warrant, WorldCut semantics unchanged, no Project0 runtime.

Mark ready only when exact-head `npm run check` passes and review threads are clear.

Stop before merge and request exact-head landing authorization.

## Follow-on

After this local Corpus witness is landed, build the third triangle side as a hostile Project0 cross-domain conformance case against TranchNode + Corpus local evidence. Shared helper/runtime code remains deferred.
