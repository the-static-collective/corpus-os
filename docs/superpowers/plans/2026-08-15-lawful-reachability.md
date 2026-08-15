# Lawful Reachability / Constituted Reality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure deterministic `deriveWorldCut(...)` projection that derives constituted state from an adopted root, balanced Causal Accounting records, and observed refs without granting authority, executing capabilities, repairing history, or inventing portable world identity.

**Architecture:** Lawful Reachability is a read-only projection downstream of Corpus OS issue #17. It consumes the adopted root plus balanced terminal causal records and observations, traverses only causally closed records under the exact adopted authority cut, admits only supported successful output refs into constituted state, records spent-authority history for failed/refused terminal attempts, and leaves unsupported observations and accounting anomalies explicitly non-constituting. The first proof remains in-process and synthetic.

**Tech Stack:** TypeScript, Node.js 22+, Node built-in test runner, existing Corpus OS runtime/kernel compilation, existing `npm run check` gate.

## Global Constraints

- **Hard dependency:** Do not implement this plan until Corpus OS issue #17 has landed on `main` and exposes the Causal Accounting reconciliation evidence used below.
- Lawful Reachability must consume Causal Accounting; it must not redefine warrant issuance, warrant spending, adopted declarations, Session admission, host execution, or reconciliation.
- `deriveWorldCut(...)` must be pure and must not mutate declarations, warrants, causal records, receipts, observations, source evidence, Session state, or host state.
- The projection must grant no authority, issue/consume no warrants, invoke no Session capability, and expose no host-reaching path.
- Only balanced causal records under the exact adopted `trustId` + `authorityCut` may constitute state.
- `completed` records may constitute declared consequence output refs; `host-failed` and `session-refused` records advance spent-authority history but must not manufacture successful outputs.
- Pre-warrant refusal is witnessed non-transition evidence, not a spent-authority consequential transition.
- Causal Accounting anomalies (`ORPHAN_EFFECT`, `DOUBLE_SPEND`, `SUBSTITUTED_CONSEQUENCE`, `BROKEN_LINEAGE`) must never silently become lawful reachability edges.
- Unsupported observed refs remain visible as `ORPHAN_OBSERVATION`; they are not deleted, repaired, quarantined, declared false, or silently admitted.
- No canonical JSON hash, canonical world identifier, signature, seal, PKI, portable warrant, database, persistence layer, second event store, scheduler, automatic repair, legal-validity claim, counterfactual administration, or prospective reachability is introduced.
- `legalValidity` remains exactly `"unclaimed"`.

---

## Upstream dependency contract

Issue #17's implementation must provide a read-only reconciled record equivalent to the approved Causal Accounting design. The implementation worker must verify the landed symbol names before starting; if names differ, use a narrow type-only adapter in `runtime/world-cut.ts` rather than modifying #17 semantics.

The reachability layer requires these semantics from each reconciled record:

```ts
type CausalDisposition =
  | "unspent"
  | "session-refused"
  | "host-failed"
  | "completed";

type CausalBalance = "balanced" | "anomaly";

type CausalAnomalyCode =
  | "ORPHAN_EFFECT"
  | "DOUBLE_SPEND"
  | "SUBSTITUTED_CONSEQUENCE"
  | "BROKEN_LINEAGE";

interface ReachabilityCause {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly actorId: string;
  readonly capacity: string;
  readonly subjectRef: string;
  readonly capabilityId: string;
  readonly capabilityOperation: string;
  readonly trustRequestId: string;
}

interface ReachabilityConsequence {
  readonly outputRefs: readonly string[];
}

interface ReachabilityCausalRecord {
  readonly cause: ReachabilityCause;
  readonly disposition: CausalDisposition;
  readonly consequence?: ReachabilityConsequence;
  readonly balance: CausalBalance;
  readonly anomalyCode?: CausalAnomalyCode;
}
```

This interface is intentionally narrower than the full accounting object. Lawful Reachability needs only the data required to prove closure; it must not import executable warrant authority.

---

### Task 1: Establish the pure world-cut contract and completed-consequence closure

**Files:**
- Create: `runtime/world-cut.ts`
- Create: `tests/lawful-reachability.test.mjs`
- Modify: `tsconfig.kernel.json` only if the existing runtime glob does not already compile `runtime/world-cut.ts`

**Interfaces:**
- Consumes: the upstream dependency semantics in `ReachabilityCausalRecord` plus an adopted-root descriptor `{ trustId, authorityCut, constitutedRefs }`.
- Produces: `deriveWorldCut(input: DeriveWorldCutInput): Readonly<WorldCut>` and exported read-only TypeScript interfaces used by Tasks 2–4.

- [ ] **Step 1: Write the failing completed-consequence test**

Add a fixture directly in `tests/lawful-reachability.test.mjs` so the first proof does not depend on Session/host execution:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { deriveWorldCut } from "../.kernel-dist/runtime/world-cut.js";

const root = Object.freeze({
  trustId: "trust:casework.synthetic",
  authorityCut: "v0.1",
  constitutedRefs: Object.freeze([
    "artifact:agreement-a",
    "artifact:correspondence-a",
  ]),
});

function completedRecord(overrides = {}) {
  return Object.freeze({
    cause: Object.freeze({
      trustId: root.trustId,
      authorityCut: root.authorityCut,
      actorId: "person:administrator",
      capacity: "administrator",
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      trustRequestId: "request:reachability-001",
    }),
    disposition: "completed",
    consequence: Object.freeze({
      outputRefs: Object.freeze(["session-output:session-request-0001"]),
    }),
    balance: "balanced",
    ...overrides,
  });
}

test("balanced completed consequence constitutes its output under the adopted root", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [completedRecord()],
    observations: ["session-output:session-request-0001"],
  });

  assert.deepEqual(world.root, {
    trustId: root.trustId,
    authorityCut: root.authorityCut,
  });
  assert.deepEqual(world.constitutedRefs, [
    "artifact:agreement-a",
    "artifact:correspondence-a",
    "session-output:session-request-0001",
  ]);
  assert.equal(world.spentCauses.length, 1);
  assert.deepEqual(world.orphanObservations, []);
  assert.deepEqual(world.unresolved, []);
  assert.equal(world.legalValidity, "unclaimed");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: FAIL because `runtime/world-cut.ts` / compiled `world-cut.js` does not exist.

- [ ] **Step 3: Implement the minimum read-only world-cut types and completed closure**

Create `runtime/world-cut.ts` with these public contracts:

```ts
export type CausalDisposition =
  | "unspent"
  | "session-refused"
  | "host-failed"
  | "completed";

export type CausalAnomalyCode =
  | "ORPHAN_EFFECT"
  | "DOUBLE_SPEND"
  | "SUBSTITUTED_CONSEQUENCE"
  | "BROKEN_LINEAGE";

export interface ReachabilityCause {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly actorId: string;
  readonly capacity: string;
  readonly subjectRef: string;
  readonly capabilityId: string;
  readonly capabilityOperation: string;
  readonly trustRequestId: string;
}

export interface ReachabilityCausalRecord {
  readonly cause: ReachabilityCause;
  readonly disposition: CausalDisposition;
  readonly consequence?: {
    readonly outputRefs: readonly string[];
  };
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCode?: CausalAnomalyCode;
}

export interface ConstitutedRoot {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly constitutedRefs: readonly string[];
}

export interface OrphanObservation {
  readonly ref: string;
  readonly classification: "ORPHAN_OBSERVATION";
}

export interface ReachabilityIssue {
  readonly classification: "UNRESOLVED";
  readonly anomalyCode?: CausalAnomalyCode;
  readonly trustRequestId?: string;
}

export interface WorldCut {
  readonly root: Readonly<Pick<ConstitutedRoot, "trustId" | "authorityCut">>;
  readonly constitutedRefs: readonly string[];
  readonly spentCauses: readonly ReachabilityCause[];
  readonly unresolved: readonly ReachabilityIssue[];
  readonly orphanObservations: readonly OrphanObservation[];
  readonly legalValidity: "unclaimed";
}

export interface DeriveWorldCutInput {
  readonly root: ConstitutedRoot;
  readonly causalRecords: readonly ReachabilityCausalRecord[];
  readonly observations: readonly string[];
}
```

Implement only the completed/balanced/root-matching path first:

```ts
function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

export function deriveWorldCut(input: DeriveWorldCutInput): Readonly<WorldCut> {
  const constituted = new Set(input.root.constitutedRefs);
  const spentCauses: ReachabilityCause[] = [];

  for (const record of input.causalRecords) {
    if (
      record.balance !== "balanced" ||
      record.cause.trustId !== input.root.trustId ||
      record.cause.authorityCut !== input.root.authorityCut
    ) {
      continue;
    }

    if (record.disposition !== "unspent") {
      spentCauses.push(Object.freeze({ ...record.cause }));
    }

    if (record.disposition === "completed") {
      for (const ref of record.consequence?.outputRefs ?? []) {
        constituted.add(ref);
      }
    }
  }

  return Object.freeze({
    root: Object.freeze({
      trustId: input.root.trustId,
      authorityCut: input.root.authorityCut,
    }),
    constitutedRefs: uniqueSorted(constituted),
    spentCauses: Object.freeze(spentCauses),
    unresolved: Object.freeze([]),
    orphanObservations: Object.freeze([]),
    legalValidity: "unclaimed",
  });
}
```

Sort output refs to make equality independent of input ordering; do not create a hash or canonical serializer.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the completed-consequence floor**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs tsconfig.kernel.json
git commit -m "feat: derive constituted world cut from balanced completion"
```

---

### Task 2: Prove failure/refusal history and pre-warrant non-transition

**Files:**
- Modify: `runtime/world-cut.ts`
- Modify: `tests/lawful-reachability.test.mjs`

**Interfaces:**
- Consumes: `deriveWorldCut(...)` and `ReachabilityCausalRecord` from Task 1.
- Produces: correct spent-authority history for `session-refused` and `host-failed`, while `unspent` records do not enter `spentCauses` or constitute outputs.

- [ ] **Step 1: Add failing tests for host failure, Session refusal, and pre-warrant/no-spend evidence**

Append:

```js
function terminalRecord(disposition, requestId) {
  return completedRecord({
    disposition,
    cause: Object.freeze({
      ...completedRecord().cause,
      trustRequestId: requestId,
    }),
    consequence: Object.freeze({ outputRefs: Object.freeze([]) }),
  });
}

test("host failure advances spent-authority history without constituting an output", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("host-failed", "request:failed")],
    observations: [],
  });

  assert.equal(world.spentCauses.length, 1);
  assert.equal(world.spentCauses[0].trustRequestId, "request:failed");
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});

test("Session refusal after warrant spend advances history without constituting an output", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("session-refused", "request:refused")],
    observations: [],
  });

  assert.equal(world.spentCauses.length, 1);
  assert.equal(world.spentCauses[0].trustRequestId, "request:refused");
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});

test("unspent or pre-consequence evidence creates no spent cause and no constituted output", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("unspent", "request:never-crossed")],
    observations: [],
  });

  assert.deepEqual(world.spentCauses, []);
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});
```

- [ ] **Step 2: Run the focused tests**

Run:

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: the host-failure and Session-refusal assertions should already pass if Task 1's minimal disposition handling is correct; the exercise is still required because it locks the intended semantics against later refactors. If any fail, do not weaken the assertions.

- [ ] **Step 3: Tighten implementation only if tests expose a mismatch**

The intended disposition rule must remain exactly:

```ts
const spent =
  record.disposition === "session-refused" ||
  record.disposition === "host-failed" ||
  record.disposition === "completed";
```

Replace a broad `record.disposition !== "unspent"` check with this explicit predicate if needed. Do not let unknown future strings silently become spent history.

- [ ] **Step 4: Run focused tests again**

Run:

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit terminal-history semantics**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs
git commit -m "test: prove failed and refused attempts advance history"
```

---

### Task 3: Preserve orphan observations and refuse anomalous/broken-lineage edges

**Files:**
- Modify: `runtime/world-cut.ts`
- Modify: `tests/lawful-reachability.test.mjs`

**Interfaces:**
- Consumes: Task 1 world-cut contracts and Causal Accounting anomaly vocabulary.
- Produces: `orphanObservations[]` and `unresolved[]` classifications; anomaly and foreign-root records cannot constitute refs or spent causes under the current root.

- [ ] **Step 1: Add failing orphan-observation test**

```js
test("observed ref with no causal ancestry remains an orphan observation", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [],
    observations: ["session-output:mystery-9999"],
  });

  assert.deepEqual(world.orphanObservations, [
    {
      ref: "session-output:mystery-9999",
      classification: "ORPHAN_OBSERVATION",
    },
  ]);
  assert.equal(
    world.constitutedRefs.includes("session-output:mystery-9999"),
    false,
  );
});
```

- [ ] **Step 2: Add failing anomaly and broken-lineage tests**

```js
for (const anomalyCode of [
  "ORPHAN_EFFECT",
  "DOUBLE_SPEND",
  "SUBSTITUTED_CONSEQUENCE",
  "BROKEN_LINEAGE",
]) {
  test(`${anomalyCode} remains unresolved and cannot constitute state`, () => {
    const anomalous = completedRecord({
      balance: "anomaly",
      anomalyCode,
      consequence: Object.freeze({
        outputRefs: Object.freeze([`session-output:${anomalyCode}`]),
      }),
    });

    const world = deriveWorldCut({
      root,
      causalRecords: [anomalous],
      observations: [`session-output:${anomalyCode}`],
    });

    assert.equal(world.constitutedRefs.includes(`session-output:${anomalyCode}`), false);
    assert.deepEqual(world.spentCauses, []);
    assert.deepEqual(world.unresolved, [
      {
        classification: "UNRESOLVED",
        anomalyCode,
        trustRequestId: anomalous.cause.trustRequestId,
      },
    ]);
  });
}

test("balanced record from another authority cut cannot bridge into this world", () => {
  const foreign = completedRecord({
    cause: Object.freeze({
      ...completedRecord().cause,
      authorityCut: "v0.2-foreign",
      trustRequestId: "request:foreign-cut",
    }),
    consequence: Object.freeze({
      outputRefs: Object.freeze(["session-output:foreign-cut"]),
    }),
  });

  const world = deriveWorldCut({
    root,
    causalRecords: [foreign],
    observations: ["session-output:foreign-cut"],
  });

  assert.equal(world.constitutedRefs.includes("session-output:foreign-cut"), false);
  assert.deepEqual(world.spentCauses, []);
  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "BROKEN_LINEAGE",
      trustRequestId: "request:foreign-cut",
    },
  ]);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: FAIL because Task 1 returns empty `orphanObservations` / `unresolved`.

- [ ] **Step 4: Implement explicit non-constituting classification**

In `deriveWorldCut(...)`, maintain `unresolved` entries before skipping records:

```ts
const unresolved: ReachabilityIssue[] = [];

for (const record of input.causalRecords) {
  const lineageMatches =
    record.cause.trustId === input.root.trustId &&
    record.cause.authorityCut === input.root.authorityCut;

  if (!lineageMatches) {
    unresolved.push(
      Object.freeze({
        classification: "UNRESOLVED",
        anomalyCode: "BROKEN_LINEAGE",
        trustRequestId: record.cause.trustRequestId,
      }),
    );
    continue;
  }

  if (record.balance !== "balanced") {
    unresolved.push(
      Object.freeze({
        classification: "UNRESOLVED",
        anomalyCode: record.anomalyCode,
        trustRequestId: record.cause.trustRequestId,
      }),
    );
    continue;
  }

  // existing balanced disposition handling
}
```

After closure, classify observations only against constituted refs:

```ts
const orphanObservations = uniqueSorted(input.observations)
  .filter((ref) => !constituted.has(ref))
  .map((ref) =>
    Object.freeze({
      ref,
      classification: "ORPHAN_OBSERVATION" as const,
    }),
  );
```

Sort `unresolved` deterministically by `trustRequestId`, then `anomalyCode`, without hashing or serialization.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit closure refusal and orphan classification**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs
git commit -m "feat: preserve orphan and unresolved world observations"
```

---

### Task 4: Prove deterministic re-entry, order independence, immutability, and non-authority

**Files:**
- Modify: `tests/lawful-reachability.test.mjs`
- Modify: `runtime/world-cut.ts` only if the tests expose ordering or mutation defects

**Interfaces:**
- Consumes: completed `deriveWorldCut(...)` projection.
- Produces: executable evidence that the same admitted inputs re-derive the same structural world, input ordering does not change the projection, source evidence is not mutated, and the returned object exposes no authority/execution methods.

- [ ] **Step 1: Add deterministic re-entry and order-independence tests**

```js
test("same admitted evidence deterministically re-derives the same world cut", () => {
  const records = [
    completedRecord(),
    terminalRecord("host-failed", "request:failed-reentry"),
  ];
  const observations = [
    "session-output:mystery-reentry",
    "session-output:session-request-0001",
  ];

  const first = deriveWorldCut({ root, causalRecords: records, observations });
  const second = deriveWorldCut({ root, causalRecords: records, observations });

  assert.deepEqual(second, first);
  assert.notEqual(second, first);
});

test("causal-record and observation insertion order do not change the derived projection", () => {
  const records = [
    completedRecord(),
    terminalRecord("host-failed", "request:order-failed"),
  ];
  const observations = [
    "session-output:z-orphan",
    "session-output:a-orphan",
    "session-output:session-request-0001",
  ];

  const forward = deriveWorldCut({ root, causalRecords: records, observations });
  const reversed = deriveWorldCut({
    root,
    causalRecords: [...records].reverse(),
    observations: [...observations].reverse(),
  });

  assert.deepEqual(reversed, forward);
});
```

- [ ] **Step 2: Add immutability test**

```js
test("derivation mutates no supplied root, causal record, or observations", () => {
  const mutableRoot = {
    trustId: root.trustId,
    authorityCut: root.authorityCut,
    constitutedRefs: ["artifact:agreement-a"],
  };
  const mutableRecord = structuredClone(completedRecord());
  const observations = ["session-output:session-request-0001"];
  const before = structuredClone({ mutableRoot, mutableRecord, observations });

  deriveWorldCut({
    root: mutableRoot,
    causalRecords: [mutableRecord],
    observations,
  });

  assert.deepEqual(
    { mutableRoot, mutableRecord, observations },
    before,
  );
});
```

- [ ] **Step 3: Add non-authority surface test**

```js
test("WorldCut exposes projection data only and no execution or authority API", () => {
  const world = deriveWorldCut({ root, causalRecords: [], observations: [] });

  for (const forbidden of [
    "run",
    "execute",
    "act",
    "admit",
    "issueWarrant",
    "consumeWarrant",
    "repair",
    "promote",
  ]) {
    assert.equal(forbidden in world, false);
  }

  assert.equal(Object.isFrozen(world), true);
  assert.equal(Object.isFrozen(world.constitutedRefs), true);
  assert.equal(Object.isFrozen(world.spentCauses), true);
  assert.equal(Object.isFrozen(world.unresolved), true);
  assert.equal(Object.isFrozen(world.orphanObservations), true);
});
```

- [ ] **Step 4: Run focused tests and verify RED/GREEN honestly**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: any order-dependence or shallow-freeze defect should fail. If all pass from prior implementation, retain these as regression proof; do not add production complexity merely to force a red test.

- [ ] **Step 5: If needed, make ordering and freezing explicit**

Use stable sort keys for `spentCauses` and `unresolved`:

```ts
spentCauses.sort((a, b) => a.trustRequestId.localeCompare(b.trustRequestId));

unresolved.sort((a, b) =>
  (a.trustRequestId ?? "").localeCompare(b.trustRequestId ?? "") ||
  (a.anomalyCode ?? "").localeCompare(b.anomalyCode ?? ""),
);
```

Freeze copied nested cause records and every returned array. Do not freeze caller-owned inputs.

- [ ] **Step 6: Run focused tests again**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit re-entry proof**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs
git commit -m "test: prove deterministic constituted-world re-entry"
```

---

### Task 5: Integrate the proof into Corpus checks and document the bounded claim

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/corpus-trust-runtime-v0.1.md` only if that document remains the project's execution-authority boundary record after #17 lands
- Test: `tests/lawful-reachability.test.mjs`

**Interfaces:**
- Consumes: complete Lawful Reachability proof from Tasks 1–4.
- Produces: repeatable project command `npm run test:reachability`, inclusion in `npm run check`, and documentation that distinguishes observed substrate from constituted state without making legal or cryptographic claims.

- [ ] **Step 1: Add the dedicated test command and check-gate entry**

In `package.json`, add:

```json
"test:reachability": "npm run build:kernel && node --test tests/lawful-reachability.test.mjs"
```

Add `npm run test:reachability` to the existing `check` chain after the Causal Accounting test command introduced by #17 and before the final build/lint stages. Preserve the repository's existing command ordering otherwise.

- [ ] **Step 2: Run the dedicated command**

```bash
npm run test:reachability
```

Expected: PASS.

- [ ] **Step 3: Document the architecture without widening the claim**

Add a short section to `docs/architecture.md`:

```markdown
## Lawful Reachability / Constituted Reality v0.1

Corpus distinguishes observed substrate from constituted state.

A pure `deriveWorldCut(...)` projection starts from the adopted declaration root and traverses only balanced Causal Accounting records under the exact adopted authority cut. Successful completed consequences may add output refs to constituted state. Session refusal after warrant spend and host failure advance accountable spent-authority history without manufacturing successful outputs. Observed refs with no accountable ancestry remain explicit `ORPHAN_OBSERVATION` entries.

The projection grants no authority, reaches no host, repairs nothing, and carries `legalValidity: "unclaimed"`. It has no canonical world hash or portable identity claim.
```

Add the two bounded laws to `README.md` near the existing warranted-execution / causal-accounting progression:

```markdown
> Existence is observed. Reality is constituted. History is the lawful path between them.

> A state belongs to the constituted present only when Corpus can derive a balanced causal path to it from the adopted root; unsupported observations remain visible without silently becoming history.
```

- [ ] **Step 4: Run the entire repository gate**

```bash
npm run check
```

Expected: PASS with the new reachability test included.

- [ ] **Step 5: Inspect the final diff for forbidden scope**

Run:

```bash
git diff --check
git diff --stat main...HEAD
git diff main...HEAD -- runtime/world-cut.ts tests/lawful-reachability.test.mjs package.json README.md docs/architecture.md docs/corpus-trust-runtime-v0.1.md
```

Verify manually that the diff contains none of these:

```text
canonical world hash
signature / PKI
portable warrant
new database / persistence
new event store
counterfactual executor
prospective scheduler
automatic repair / deletion
legal-validity adjudication
host/session execution from world-cut.ts
```

- [ ] **Step 6: Commit integration/docs**

```bash
git add package.json README.md docs/architecture.md docs/corpus-trust-runtime-v0.1.md
git commit -m "docs: record constituted reality proof boundary"
```

If `docs/corpus-trust-runtime-v0.1.md` does not need modification after inspection, omit it from `git add` rather than making a cosmetic change.

---

## Final verification gate

After all tasks:

- [ ] Run:

```bash
npm run check
git diff --check
git status --short
```

Expected:

```text
npm run check: PASS
git diff --check: no output
git status --short: only intentional uncommitted state, preferably empty
```

- [ ] Re-read `docs/superpowers/specs/2026-08-15-lawful-reachability-design.md` and verify every v0.1 acceptance item has an executable test or explicit documentation boundary.
- [ ] Confirm `runtime/world-cut.ts` imports no host adapter, `CorpusSession`, `WarrantedCorpusSession`, warrant-consumption function, filesystem/database module, cryptographic signer, or canonical serializer.
- [ ] Confirm the final PR description says this proof establishes deterministic constituted-world derivation from supplied accountable evidence, not authenticity of arbitrary persisted history or prevention of external mutation.
