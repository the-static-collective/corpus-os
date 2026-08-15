# Causal Accounting / Linear Authority — Design

## Status

Approved concept, **blocked on Corpus OS issue #16**. This document names the post-#16 specimen and keeps it out of the adopted-declaration-root slice.

## Governing distinction

**Linear Authority** is the primitive:

> Executable authority cannot be reproduced merely by copying representation; admitted authority is spent against a bounded consequential attempt.

**Causal Accounting** is the system that emerges:

> Consequential state must reconcile against attributable, admitted, spent causes and terminal receipts.

Warranted Execution asks whether a proposed action may cross the consequence boundary. Causal Accounting asks how every consequence that did cross that boundary accounts for the authority consumed to cause it.

## Conservation law

> **One admitted act may produce at most one consequential attempt, and every consequential attempt must account for the authority that was consumed to cause it.**

Equivalent compression:

> **No consequence without cause. No cause without authority. No authority without accounting.**

The primitive is intentionally linear rather than copyable: an inspectable warrant can be represented, but copying its fields cannot duplicate executable authority.

## Required prerequisite

Issue #16 must first establish both of these properties without importing this specimen into its scope:

1. a particular declaration cut is explicitly adopted by the local Corpus authority root, rather than merely supplied by caller code;
2. normal consequence-producing execution cannot bypass a valid warrant and reach the host through bare Session invocation.

Causal Accounting does not define how adoption works. It consumes the result.

## First specimen

The first implementation should remain entirely in-process and synthetic. It should derive a reconciliation view from the authority and receipt objects already produced by the adopted Warranted Execution path, without inventing persistence, canonical serialization, signing, money-like token semantics, or a second event store.

For each issued warrant, reconciliation must be able to classify the terminal state as one of:

- `unspent`
- `session-refused`
- `host-failed`
- `completed`

The first executable proof should cover four ordinary paths:

1. adopted authority → warrant → completed consequence;
2. adopted authority → warrant → host failure;
3. proposal refused before warrant issuance → no host reachability;
4. legitimate warrant spent once → second attempted spend refused with no second consequence.

## Anomaly vocabulary

The accounting layer should be able to *detect or represent*, not silently repair, at least these invariant failures:

- **ORPHAN_EFFECT** — a consequential receipt exists with no attributable spent warrant;
- **DOUBLE_SPEND** — one warrant is associated with more than one consequential attempt;
- **SUBSTITUTED_CONSEQUENCE** — consequence fields do not match the capability / operation / bounded input admitted by the warrant;
- **BROKEN_LINEAGE** — receipt or consequence is attached to the wrong adopted authority cut.

These names describe computational integrity states only. They do not claim legal invalidity, fraud, financial accounting status, or jurisdiction-specific consequences.

## Data model direction

Do not mint a portable ledger yet. A minimal reconciliation record can be derived in memory from runtime evidence:

```text
CausalEntry
  warrant
    trustId
    authorityCut
    actorId
    capacity
    subjectRef
    capabilityId
    capabilityOperation
    trustRequestId
  disposition
    unspent | session-refused | host-failed | completed
  consequence
    launchReceipt? / host observation?
  balance
    balanced | anomaly
  anomalyCode?
```

The record is a view over existing evidence, not new authority.

## Provable non-action boundary

The specimen may make only bounded claims such as:

> Under this Corpus consequence boundary, this request never obtained executable authority and therefore never crossed the host boundary.

It must not claim that no other machine, process, actor, or external system performed a similar act.

## Non-goals

Do not include in the first Causal Accounting specimen:

- issue #16 adoption mechanics;
- legal-validity claims;
- monetary or token economics;
- cryptographic signing or portable warrants;
- canonical JSON identity;
- persistence or databases;
- distributed double-spend prevention;
- temporal succession/revocation law beyond the adopted cut already provided by #16;
- model/agent orchestration;
- UI;
- automatic repair of anomalous history.

## Acceptance direction

The future implementation is ready to land when it can mechanically prove:

- one issued warrant creates at most one consequential attempt;
- a completed host effect reconciles to the exact warrant that authorized it;
- a host failure still consumes and terminally accounts for its warrant;
- a pre-warrant refusal produces no executable authority and no host consequence;
- copied warrant representation cannot become a second cause;
- a deliberately injected orphan effect is detected rather than normalized;
- a deliberately injected second consequence for one warrant is detected as double spend;
- a consequence with substituted admitted fields is detected;
- a consequence bound to the wrong adopted authority cut is detected;
- reconciliation does not mutate source evidence, authority declarations, warrants, or receipts.

## Sequencing

1. Land #16: adopted declaration root + mandatory consequence boundary.
2. Reverify Warranted Execution against the adopted path.
3. Implement this Causal Accounting specimen as its own issue/PR.
4. Only after the in-process proof survives use, consider durable administration-history reconciliation.
