# Lawful Reachability / Constituted Reality — Design

## Status

Approved concept. **Blocked on Corpus OS issue #17 (Linear Authority / Causal Accounting).**

This design is the direct child of Causal Accounting. It must not widen issue #17. Issue #17 first proves that consequential attempts reconcile against attributable, admitted, spent authority. This design consumes only balanced causal history and asks a different question:

> Given the adopted root and everything that has accountably happened since, what is entitled to count as the present constituted world?

## Governing distinction

Three names describe different layers of the same design:

- **Constituted Reality** — the architectural frame: observed substrate and constituted state are not assumed to be identical.
- **Lawful Reachability** — the mechanical primitive: a state belongs to the constituted present only when a valid causal path reaches it from the adopted root.
- **Causal Closure** — the invariant: everything claimed as part of the current constituted world must close back onto accountable causes, or remain explicitly orphaned / unresolved.

Compression:

> **Existence is observed. Reality is constituted. History is the lawful path between them.**

And, after Linear Authority:

> **Authority dies when spent. Its receipt remains. The world advances by the residue.**

These are computational integrity claims only. They do not establish legal validity, jurisdiction-specific status, metaphysical truth, or external-world exclusivity.

## Prerequisite

Issue #17 must first provide a non-authoritative reconciliation view over existing Corpus execution evidence. In particular, Corpus must be able to distinguish at least:

- balanced completed consequence;
- balanced host failure;
- balanced Session refusal after warrant consumption;
- pre-warrant refusal / no executable authority;
- anomaly states such as orphan effect, double spend, substituted consequence, and broken lineage.

Lawful Reachability does not redefine warrant issuance, warrant spending, adopted declarations, Session admission, host execution, or Causal Accounting. It consumes their result.

## Core law

A physically or computationally observed thing is not automatically part of constituted state.

```text
adopted root
    ↓
balanced admitted transition
    ↓
causal record / terminal receipt
    ↓
balanced admitted transition
    ↓
causal record / terminal receipt
    ↓
CURRENT CONSTITUTED CUT
```

A thing joins constituted state only when a valid, balanced causal path reaches it from the adopted root.

Conceptually:

```text
Constituted(Wn)
  = closure(adoptedRoot, balancedAdmittedTransitions≤n)
```

Observed material outside that closure remains visible but must not silently redefine the world.

```text
OBSERVED ∩ REACHABLE = constituted
OBSERVED − REACHABLE = orphan observation
```

## Important consequence: failure can advance history

World cuts are not merely snapshots of successful outputs.

A genuine warrant is consumed before Session capability admission or any host await. Therefore all of these can change the constituted historical cut:

1. warrant consumed → Session refused;
2. warrant consumed → host failed;
3. warrant consumed → host completed.

Only the completed path may add a new output ref, but the refused and failed paths still leave spent authority and terminal evidence behind.

Therefore:

```text
W1 + admitted/spent attempt + terminal failure ≠ W1
```

The new world may contain no new successful artifact while still differing materially in history, spent authority, and future possibility.

By contrast, a proposal refused before warrant issuance does not create a consequential transition. It remains witnessed non-transition evidence rather than a spent-authority historical step.

## v0.1 architecture

The first implementation is a pure derived projection. It must not become a new authority root, event store, scheduler, or mutation engine.

Candidate API shape:

```ts
deriveWorldCut(
  root,
  causalRecords,
  observations,
): WorldCut
```

The function:

- grants no authority;
- issues no warrants;
- consumes no warrants;
- invokes no Session capability;
- reaches no host;
- mutates no source evidence, declaration, receipt, or causal record;
- automatically repairs nothing;
- derives only what the supplied accountable evidence supports.

### Candidate world projection

```text
WorldCut
  root
    trustId
    authorityCut

  constitutedRefs[]
  spentCauses[]
  unresolved[]
  orphanObservations[]
  legalValidity: unclaimed
```

This is a projection, not a new canonical object identity.

Do **not** assign a canonical JSON hash, portable world identifier, signature, or seal in v0.1. Corpus still has an explicit canonical-addressing boundary; this slice must not create a second identity law.

Deterministic structural equality over the same admitted inputs is sufficient for the first proof.

## Observation vocabulary

Use deliberately bounded machine vocabulary:

- `CONSTITUTED` — observation is supported by causal closure from the adopted root;
- `ORPHAN_OBSERVATION` — observation is present but no valid causal ancestry establishes it as constituted state;
- `UNRESOLVED` — available evidence is insufficient to classify safely;
- anomaly classifications imported from Causal Accounting remain anomalies and cannot silently constitute state.

The human-facing phrase **orphan reality** may remain useful as conceptual language, but code should avoid implying metaphysical invalidity or malice.

An orphan observation is not automatically false, corrupt, hostile, fraudulent, or deletable. The bounded claim is only:

> These observed bytes / refs are present, but Corpus cannot establish a valid causal path by which they entered this constituted world.

## First executable specimen

Remain entirely in-process and synthetic. Use the existing adopted Casework declaration and the Causal Accounting evidence produced after issue #17.

### Specimen A — completed consequence

```text
W0
  → admitted warrant
  → spent authority
  → completed Session/host consequence
  → balanced causal record
  → output ref
  = W1
```

Expected result: the balanced output ref appears in `W1.constitutedRefs`.

### Specimen B — host failure

```text
W1
  → admitted warrant
  → spent authority
  → host failure
  → balanced terminal causal record
  = W2
```

Expected result:

- no successful output ref is manufactured;
- `W2` differs from `W1` because spent authority and terminal failure now belong to accountable history.

### Specimen C — Session refusal after spend

```text
W2
  → admitted warrant
  → spent authority
  → Session capability refusal
  → balanced terminal causal record
  = W3
```

Expected result:

- no successful output ref is manufactured;
- the spent warrant remains historically accounted for;
- the world cut advances because that authority is no longer live.

### Specimen D — pre-warrant refusal

```text
W3
  → Trust / warrant admission refusal
  → no warrant
  → no Session consequence
```

Expected result:

- no spent authority is added;
- no consequence ref is constituted;
- the refusal may remain witnessed evidence, but it is not modeled as a consequential state transition.

### Specimen E — orphan observation

Inject an observed ref such as:

```text
session-output:mystery-9999
```

with no balanced causal record producing it.

Expected result:

```text
observed: yes
constituted: no
classification: ORPHAN_OBSERVATION
```

The observation remains inspectable and is not normalized, deleted, silently admitted, or treated as historical fact.

## Re-entry proof

The first re-entry claim is deterministic reconstruction of the same derived world projection from the same admitted historical evidence.

```text
root + balanced causal history + observations
  → deriveWorldCut(...)
  → Wn

projection discarded

same admitted inputs
  → deriveWorldCut(...)
  → Wn
```

The two projections must agree structurally under the declared v0.1 contract.

Bounded claim:

> Given this admitted historical evidence, Corpus deterministically reconstructs the same constituted-world projection.

Do not claim yet that an arbitrary serialized bundle can authenticate itself as genuine history after process restart. Current executable authority is deliberately process-local, and this design adds no signing, persistence, or portable authority root.

This is the computational neighbor of the Collective pattern:

> Do not preserve every room forever. Preserve enough truthful relation that the world can make another room.

In Corpus terms:

> Preserve enough accountable causality that the present can be re-derived.

## Counterfactual direction — explicitly deferred

Once `deriveWorldCut` is proven pure, counterfactual worlds become a natural later projection:

```text
W0
  ├─ admitted A → W1 actual
  └─ proposed B → Wβ counterfactual
```

A counterfactual projection must remain explicitly non-historical and non-authoritative. It may explore what could become reachable without promoting possibility into actual history.

Possible later shape:

```text
CounterfactualWorld
  baseCut
  proposedTransition
  historical: false
  promotionAuthority: none
```

Counterfactual administration is **not** part of v0.1.

## Prospective reachability — explicitly deferred

The stronger future question is:

> Which next states appear reachable from the present cut under currently constituted authority and constraints?

A future pure projection might classify candidate transitions as:

- possible under current declared authority;
- requires new declaration / adoption;
- authority already spent;
- currently impossible;
- unresolved.

This projection must never become a hidden scheduler or execution authority. A reachability map may describe admissibility conditions; it may not execute merely because a path appears available.

## Security boundary

Lawful Reachability provides **tamper legibility**, not magical tamper prevention.

If observed substrate changes without accountable causal ancestry, the difference can remain orphaned rather than automatically becoming constituted state.

This supports a bounded claim:

> Unauthorized substrate mutation need not automatically redefine constituted state.

It does **not** support:

> Corpus makes unauthorized mutation impossible.

Nor can v0.1 prove history authentic if an attacker can rewrite both the substrate and every causal record supplied to `deriveWorldCut`. Stronger restart or adversarial provenance claims require later evidence-preservation primitives such as immutable storage, signatures/attestation, external witnesses, or an adopted portable identity mechanism.

## Anomaly treatment

Causal Accounting anomalies cannot be silently traversed as lawful edges.

At minimum:

- `ORPHAN_EFFECT` does not constitute a new output;
- `DOUBLE_SPEND` does not allow either duplicated consequence to silently become ordinary history;
- `SUBSTITUTED_CONSEQUENCE` does not constitute substituted fields as if admitted;
- `BROKEN_LINEAGE` cannot bridge one adopted authority cut into another.

The world projection should preserve anomaly evidence under `unresolved` or another explicit non-constituting bucket until a later human or system process addresses it. v0.1 performs no automatic repair.

## Acceptance direction

The implementation is ready to land when it mechanically proves:

- [ ] a balanced completed consequence advances the constituted cut and admits its output ref;
- [ ] a balanced host failure advances accountable history without manufacturing a successful output;
- [ ] a balanced Session refusal after warrant consumption advances spent-authority history without manufacturing a successful output;
- [ ] a pre-warrant refusal creates no spent authority and no consequential state transition;
- [ ] an observed ref with no causal ancestry remains visible as `ORPHAN_OBSERVATION` and does not join constituted state;
- [ ] Causal Accounting anomalies cannot silently become lawful reachability edges;
- [ ] broken authority-cut lineage cannot constitute state under the wrong adopted root;
- [ ] re-deriving from the same root, balanced causal records, and observations produces the same world projection;
- [ ] deriving a world cut mutates no declaration, warrant, causal record, receipt, observation, source evidence, or host state;
- [ ] the world projection grants no authority and provides no execution path;
- [ ] no canonical serializer, signature scheme, persistence layer, database, event store, portable authority, or legal-validity claim is introduced.

## Non-goals

Do not include in v0.1:

- issue #17 Causal Accounting implementation itself;
- declaration succession or revocation law;
- canonical world identity / canonical JSON;
- signatures, PKI, attestations, or portable warrants;
- databases, persistence, or a second event store;
- distributed consensus or distributed double-spend prevention;
- automatic repair / quarantine / deletion of orphan observations;
- counterfactual administration;
- prospective next-transition enumeration;
- scheduler or model/agent orchestration;
- UI;
- legal validity, trust-law adjudication, fraud determination, or jurisdiction-specific conclusions.

## Sequencing

1. Complete issue #17: Linear Authority / Causal Accounting.
2. Verify that Causal Accounting exposes balanced terminal causal records without creating new authority.
3. Implement the first pure `deriveWorldCut` specimen over the existing synthetic adopted Casework root.
4. Prove completed / failed / refused / pre-warrant / orphan-observation paths.
5. Prove deterministic re-derivation from the same admitted evidence.
6. Only after this local specimen survives use, consider counterfactual worlds, prospective reachability, portable re-entry, or cross-project graduation.

## Graduation boundary

Do not promote Lawful Reachability into a universal Static Collective law from one Corpus OS specimen.

For now it belongs in the Primitive Incubator as a project-backed hypothesis with a concrete proving ground. A future cross-project graduation should require a materially different system to reproduce the useful invariant without importing Corpus-specific trust or warrant semantics.

The portable candidate law, if it survives, is:

> **A present state may be observed directly, but its constituted status is a derived claim about accountable reachability from an adopted prior state.**
