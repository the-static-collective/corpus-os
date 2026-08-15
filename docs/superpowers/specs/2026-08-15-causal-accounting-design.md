# Causal Accounting / Linear Authority — Design

## Status

Implemented as the bounded Corpus OS issue #17 specimen on PR #21, pending review and merge. The prerequisite adopted-declaration-root / mandatory warranted consequence boundary from issue #16 is complete. Lawful Reachability / Constituted Reality remains downstream in issue #20.

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

Issue #16 established both required properties without importing this specimen into its scope:

1. a particular declaration cut is explicitly adopted by the local Corpus authority root, rather than merely supplied by caller code;
2. normal consequence-producing execution cannot bypass a valid warrant and reach the host through bare Session invocation.

Causal Accounting does not define how adoption works. It consumes that result.

## First specimen

The implementation remains entirely in-process and synthetic. It derives a reconciliation view from the authority and receipt objects already produced by the adopted Warranted Execution path, without inventing persistence, canonical serialization, signing, money-like token semantics, or a second event store.

For each genuine issued warrant, reconciliation classifies ordinary terminal history as one of:

- `unspent`
- `session-refused`
- `host-failed`
- `completed`

The executable proof covers these ordinary paths:

1. adopted authority → warrant → completed consequence;
2. adopted authority → warrant → host failure;
3. adopted authority → warrant → Session refusal;
4. proposal refused before warrant issuance → no Session or host reachability;
5. legitimate warrant spent once → second attempted spend refused with no second consequence.

The runtime exposes warrant resource state separately as `unspent | spent`. This is deliberately not the terminal-history type: **spent is not history**.

## Terminal causal evidence

Every accepted Session attempt returns a `LaunchReceipt` with a `causalBinding` copied from the already-consumed genuine Action Warrant:

```text
trustId
authorityCut
subjectRef
capabilityId
capabilityOperation
capabilityOwner
trustRequestId
operationInput
```

The binding is evidence only. It is not inserted into the private issued-warrant registry and cannot reproduce executable authority.

## Anomaly vocabulary

The accounting layer detects or represents, and never silently repairs, these invariant failures:

- **ORPHAN_EFFECT** — consequential receipt evidence exists without an attributable genuine spent warrant in the reconciliation cut;
- **DOUBLE_SPEND** — one warrant is associated with more than one terminal consequential attempt;
- **SUBSTITUTED_CONSEQUENCE** — consequence fields do not match the subject / capability / operation / owner / request / bounded input admitted by the warrant;
- **BROKEN_LINEAGE** — receipt evidence is attached to the wrong trust or adopted authority cut;
- **MISSING_DISPOSITION** — a genuine warrant is already spent but the supplied causal history omits its terminal attempt evidence.

These names describe computational integrity states only. They do not claim legal invalidity, fraud, financial accounting status, or jurisdiction-specific consequences.

A rejected replay (`ACTION_WARRANT_ALREADY_CONSUMED`) is not a second consequence. If the original receipt is present, that history remains balanced. `DOUBLE_SPEND` is reserved for evidence that attributes more than one terminal consequence to the same warrant.

## Data model

The specimen does not mint a portable ledger. `runtime/causal-accounting.ts` derives an in-memory view over existing runtime evidence:

```text
CausalReconciliation
  entries[]
    warrant                  # genuine issued object identity
    disposition
      unspent | session-refused | host-failed | completed | null
    receipts[]
    balance
      balanced | anomaly
    anomalyCodes[]
  orphanEffects[]
  balanced
```

Inputs are:

```text
warrants[]
attempts[]
  warrant?                   # must be a genuine issued object
  receipt                    # terminal Session/host evidence
```

Copied/JSON/structured-cloned warrant representations cannot become causes because they do not inherit private issuance membership.

The reconciliation result freezes only new derived entries and arrays. It does not mutate the adopted declaration, Action Warrants, launch receipts, or caller-provided evidence ordering.

## Provable non-action boundary

The specimen may make only bounded claims such as:

> Under this Corpus consequence boundary, this request never obtained executable authority and therefore never crossed the host boundary.

It must not claim that no other machine, process, actor, or external system performed a similar act.

## Non-goals

The first Causal Accounting specimen does not include:

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
- automatic repair of anomalous history;
- `WorldCut`, Lawful Reachability, or constituted-state derivation from issue #20.

## Acceptance proof

The #17 test suite mechanically proves:

- one genuine issued warrant creates at most one actual Session/host consequence under the runtime boundary;
- a completed host effect reconciles to the exact warrant that authorized it;
- a host failure still consumes and terminally accounts for its warrant;
- a Session refusal still consumes and terminally accounts for its warrant;
- a pre-warrant refusal produces no executable authority, Session receipt, or host consequence;
- copied warrant representation cannot become a second cause;
- a deliberately injected orphan effect is detected rather than normalized;
- a deliberately injected second consequence for one warrant is detected as double spend;
- a consequence with substituted admitted fields is detected;
- a consequence bound to the wrong adopted authority cut is detected;
- a spent warrant with omitted terminal evidence remains explicitly anomalous rather than being guessed or collapsed;
- reconciliation does not mutate source evidence, authority declarations, warrants, receipts, or input ordering.

The repository contract includes this proof through `npm run test:causal` inside `npm run check`.

## Sequencing

1. #16 — adopted declaration root + mandatory consequence boundary: complete.
2. #17 — Linear Authority / Causal Accounting in-process proof: implemented on PR #21, pending merge.
3. #20 — Lawful Reachability / Constituted Reality: remains downstream and must consume #17 rather than redefining balanced causal history.
4. Durable administration-history reconciliation may be considered only after this bounded proof survives use.
