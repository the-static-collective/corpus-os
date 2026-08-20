# Corpus Continuity Attestation v0.1 — Design

Date: 2026-08-20
Source issue: #30 — Continuity Attestation v0
Umbrella: Static Collective Continuity Witness — shared questions, local answers
Status: approved architectural slice for the Continuity stalk-thickening run

## Purpose

Add one Corpus-local, frozen inspection projection that compares two already-derived `WorldCut` values and answers:

> Why is this the current constituted world, what crossed from the prior one, what did not, and which authority questions remain separate?

The attestation explains succession. It does not perform succession.

## Governing laws

> **Continuity may explain succession. It does not perform succession.**

> **A continuity attestation is a witness, not a warrant.**

`deriveWorldCut(...)` remains the only owner of constituted-world derivation in this slice. The attestation never admits causal history, constitutes refs, validates warrants, consumes authority, launches a capability, reaches a host port, repairs anomalies, or changes either cut.

## Existing evidence reused

`runtime/world-cut.ts` already provides frozen local evidence:

- exact `trustId + authorityCut` root;
- `constitutedRefs`;
- distinguishable `terminalHistory` (`session-refused`, `host-failed`, `completed`);
- explicit unresolved causal evidence;
- explicit orphan observations;
- `legalValidity: "unclaimed"`.

The attestation composes these values; it does not duplicate Lawful Reachability.

## Selected API

Create `runtime/continuity-attestation.ts`.

```ts
interface ContinuityTransitionEvidence {
  kind: "transformed" | "lost";
  priorRef: string;
  currentRef?: string;
  evidenceRef: string;
}

interface DeriveCorpusContinuityAttestationInput {
  priorCutRef: string;
  currentCutRef: string;
  priorCut: WorldCut;
  currentCut: WorldCut;
  transitionEvidence: readonly ContinuityTransitionEvidence[];
  authorityContinuity: "none" | "separately-evidenced" | "unresolved";
  authorityEvidenceRefs: readonly string[];
}
```

Return frozen inert data shaped approximately as:

```ts
interface CorpusContinuityAttestationV01 {
  schema: "corpus/continuity-attestation/v0.1";
  priorCutRef: string;
  currentCutRef: string;
  trustId: string;
  purpose: "corpus-worldcut-succession";
  preservedRefs: readonly string[];
  transformed: readonly {
    priorRef: string;
    currentRef: string;
    evidenceRef: string;
  }[];
  lost: readonly {
    priorRef: string;
    evidenceRef: string;
  }[];
  unresolvedRefs: readonly string[];
  priorTerminalHistory: WorldCut["terminalHistory"];
  currentTerminalHistory: WorldCut["terminalHistory"];
  priorUnresolved: WorldCut["unresolved"];
  currentUnresolved: WorldCut["unresolved"];
  priorOrphanObservations: WorldCut["orphanObservations"];
  currentOrphanObservations: WorldCut["orphanObservations"];
  transitionEvidenceRefs: readonly string[];
  authorityCutChange: {
    prior: string;
    current: string;
    changed: boolean;
  };
  authorityContinuity: "none" | "separately-evidenced" | "unresolved";
  authorityEvidenceRefs: readonly string[];
  whyCurrent: {
    currentCutRef: string;
    authorityCut: string;
    constitutedRefs: readonly string[];
    transitionEvidenceRefs: readonly string[];
  };
  legalValidity: "unclaimed";
}
```

No canonical global attestation hash is introduced.

## Classification law

All ref comparisons use only `WorldCut.constitutedRefs`.

1. **preserved** — exact ref exists in both cuts.
2. **transformed** — prior ref exists only in the prior cut, current ref exists only in the current cut, and an explicit `kind: "transformed"` evidence edge names both plus an `evidenceRef`.
3. **lost** — prior ref exists only in the prior cut and an explicit `kind: "lost"` evidence edge names it plus an `evidenceRef`.
4. **unresolved** — any constituted ref present in exactly one cut that is not lawfully classified by an explicit transition edge.

Matching bytes/text outside `constitutedRefs` never count as preserved. Orphan observations remain orphan evidence even when the same string appears in both cut observation sets.

A transition edge is descriptive evidence only. It cannot add a ref to either cut.

## Fail-closed boundary

Reject when:

- `priorCut.root.trustId !== currentCut.root.trustId`;
- cut refs or evidence refs are blank;
- duplicate transition evidence exists for the same prior ref;
- `transformed` omits `currentRef`;
- `lost` supplies `currentRef`;
- transition evidence names refs that do not occupy the required prior-only/current-only positions;
- `authorityContinuity: "separately-evidenced"` has no authority evidence ref;
- caller arrays contain accessor-backed or sparse representation that would execute code during validation.

No prose/name inference is permitted.

## Authority boundary

The attestation accepts no warrant object and exposes no warrant validation/execution API.

`authorityContinuity: "separately-evidenced"` means only that the caller supplied separate evidence refs. It does not validate those refs, revive an old warrant, bridge an authority-cut change, or make copied warrant-shaped data executable.

`authorityCutChange` is always explicit, including when unchanged.

## First synthetic specimen

Use two separately derived WorldCuts for one trust:

- prior cut `v0.1` contains `artifact:agreement-a`, `artifact:legacy-note`, `artifact:correspondence-a`;
- current cut `v0.2` contains `artifact:agreement-a`, `artifact:correspondence-a`, and accountable new `artifact:amendment-b`;
- explicit transform evidence maps `artifact:legacy-note -> artifact:amendment-b`;
- one terminal refusal remains visible in prior history;
- one host failure remains visible in current history;
- one orphan observation appears in both cuts but never becomes `preservedRefs`;
- authority cut changes `v0.1 -> v0.2` while `authorityContinuity` remains separate/inert.

A second case removes a prior-only ref without transition evidence and proves it becomes `unresolvedRefs`, not `lost`.

## TDD acceptance

Tests must prove at minimum:

1. same admitted cuts/evidence deterministically produce the same frozen attestation;
2. preserved/transformed/lost/unresolved remain mechanically distinct;
3. refusal and host-failure terminal history remain visible and distinct;
4. orphan matching never becomes preservation;
5. authority-cut change is explicit;
6. separately-evidenced authority remains inert and does not validate an old/copy-shaped warrant;
7. JSON/spread/`structuredClone` output remains inert data;
8. invalid/ambiguous transition evidence fails closed;
9. hostile accessor-backed arrays fail closed without executing accessors;
10. existing Lawful/Latent Reachability and Warranted Execution gates remain green.

## Project0 relationship

Do not add the Project0 adapter in this PR.

Corpus first proves a truthful local attestation. A later cross-domain pressure slice may map this inert local output into the portable Project0 continuity profile. Project0 does not own Corpus succession semantics.

## Non-goals

- no portable/network warrants;
- no automatic authority succession or revocation;
- no legal trust succession claim;
- no canonical global project identity;
- no canonical attestation hash;
- no persistence/database/event bus;
- no universal Continuity service;
- no model-generated causal narrative;
- no missing-history repair;
- no Project0 runtime/package dependency.

## Stop condition

Stop if the attestation must mutate a WorldCut, infer causal meaning from prose, validate/consume a warrant, bridge an authority cut, or manufacture missing transition evidence.

## Working compression

> **WorldCut constitutes the world. Continuity Attestation explains the succession. Neither grants authority.**
