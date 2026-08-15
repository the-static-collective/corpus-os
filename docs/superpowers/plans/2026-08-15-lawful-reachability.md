# Lawful Reachability / Constituted Reality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure deterministic `deriveWorldCut(...)` projection that derives constituted state from an adopted root, balanced Causal Accounting records, and observed refs without granting authority, executing capabilities, repairing history, or inventing portable world identity.

**Architecture:** Lawful Reachability is a read-only projection downstream of Corpus OS issue #17. It traverses only balanced causal records under the exact adopted authority cut. Completed records may constitute output refs; Session refusal after warrant spend and host failure advance a preserved terminal-history projection without manufacturing successful outputs. Unsupported observations and accounting anomalies remain explicitly non-constituting.

**Tech Stack:** TypeScript, Node.js 22+, Node built-in test runner, existing Corpus OS runtime/kernel compilation, existing `npm run check` gate.

## Global Constraints

- **Hard dependency:** Do not implement this plan until Corpus OS issue #17 has landed on `main` and exposes the Causal Accounting reconciliation evidence used below.
- Lawful Reachability consumes Causal Accounting; it must not redefine warrant issuance, warrant spending, adopted declarations, Session admission, host execution, or reconciliation.
- `deriveWorldCut(...)` is pure: it mutates no declaration, warrant, causal record, receipt, observation, source evidence, Session state, or host state.
- The projection grants no authority, issues/consumes no warrants, invokes no Session capability, and exposes no host-reaching path.
- Only balanced causal records under the exact adopted `trustId` + `authorityCut` may constitute state or terminal history.
- `completed` may constitute declared consequence output refs.
- `host-failed` and `session-refused` must remain distinguishable terminal historical states and must not manufacture successful outputs.
- `unspent` / pre-consequence evidence is not a spent-authority historical transition.
- Causal Accounting anomalies (`ORPHAN_EFFECT`, `DOUBLE_SPEND`, `SUBSTITUTED_CONSEQUENCE`, `BROKEN_LINEAGE`) never silently become lawful reachability edges.
- Unsupported observed refs remain visible as `ORPHAN_OBSERVATION`; they are not deleted, repaired, quarantined, declared false, or silently admitted.
- No canonical JSON hash, canonical world identifier, signature, seal, PKI, portable warrant, database, persistence layer, second event store, scheduler, automatic repair, legal-validity claim, counterfactual administration, or prospective reachability is introduced.
- `legalValidity` remains exactly `"unclaimed"`.

---

## Upstream dependency contract

Issue #17 must expose read-only reconciliation evidence equivalent to the approved Causal Accounting design. If the landed names differ, adapt them through a narrow type-only/field-mapping boundary in `runtime/world-cut.ts`; do not change #17 semantics merely to satisfy this plan.

Lawful Reachability needs this narrow semantic shape:

```ts
type CausalDisposition =
  | "unspent"
  | "session-refused"
  | "host-failed"
  | "completed";

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

interface ReachabilityCausalRecord {
  readonly cause: ReachabilityCause;
  readonly disposition: CausalDisposition;
  readonly consequence?: { readonly outputRefs: readonly string[] };
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCode?: CausalAnomalyCode;
}
```

This is intentionally narrower than the full accounting object. No executable warrant object crosses into the reachability projection.

---

### Task 1: Establish the pure world-cut contract and completed-consequence closure

**Files:**
- Create: `runtime/world-cut.ts`
- Create: `tests/lawful-reachability.test.mjs`
- Modify: `tsconfig.kernel.json` only if the existing runtime include/glob does not compile `runtime/world-cut.ts`

**Interfaces:**
- Consumes: `ConstitutedRoot`, `ReachabilityCausalRecord[]`, `observations[]`.
- Produces: `deriveWorldCut(input: DeriveWorldCutInput): Readonly<WorldCut>`.

- [ ] **Step 1: Write the first failing test**

Create `tests/lawful-reachability.test.mjs`:

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

test("balanced completion constitutes output and preserves terminal history", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [completedRecord()],
    observations: ["session-output:session-request-0001"],
  });

  assert.deepEqual(world.constitutedRefs, [
    "artifact:agreement-a",
    "artifact:correspondence-a",
    "session-output:session-request-0001",
  ]);
  assert.deepEqual(world.terminalHistory, [
    {
      cause: completedRecord().cause,
      disposition: "completed",
      outputRefs: ["session-output:session-request-0001"],
    },
  ]);
  assert.deepEqual(world.orphanObservations, []);
  assert.deepEqual(world.unresolved, []);
  assert.equal(world.legalValidity, "unclaimed");
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: FAIL because `world-cut.js` does not exist.

- [ ] **Step 3: Implement the minimum projection contract**

Create `runtime/world-cut.ts`:

```ts
export type CausalDisposition =
  | "unspent"
  | "session-refused"
  | "host-failed"
  | "completed";

export type TerminalDisposition = Exclude<CausalDisposition, "unspent">;

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
  readonly consequence?: { readonly outputRefs: readonly string[] };
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCode?: CausalAnomalyCode;
}

export interface ConstitutedRoot {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly constitutedRefs: readonly string[];
}

export interface TerminalHistoryEntry {
  readonly cause: ReachabilityCause;
  readonly disposition: TerminalDisposition;
  readonly outputRefs: readonly string[];
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
  readonly terminalHistory: readonly TerminalHistoryEntry[];
  readonly unresolved: readonly ReachabilityIssue[];
  readonly orphanObservations: readonly OrphanObservation[];
  readonly legalValidity: "unclaimed";
}

export interface DeriveWorldCutInput {
  readonly root: ConstitutedRoot;
  readonly causalRecords: readonly ReachabilityCausalRecord[];
  readonly observations: readonly string[];
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function terminalDisposition(
  value: CausalDisposition,
): value is TerminalDisposition {
  return (
    value === "session-refused" ||
    value === "host-failed" ||
    value === "completed"
  );
}

export function deriveWorldCut(input: DeriveWorldCutInput): Readonly<WorldCut> {
  const constituted = new Set(input.root.constitutedRefs);
  const terminalHistory: TerminalHistoryEntry[] = [];

  for (const record of input.causalRecords) {
    if (
      record.balance !== "balanced" ||
      record.cause.trustId !== input.root.trustId ||
      record.cause.authorityCut !== input.root.authorityCut
    ) {
      continue;
    }

    if (terminalDisposition(record.disposition)) {
      const outputRefs =
        record.disposition === "completed"
          ? uniqueSorted(record.consequence?.outputRefs ?? [])
          : Object.freeze([] as string[]);

      terminalHistory.push(
        Object.freeze({
          cause: Object.freeze({ ...record.cause }),
          disposition: record.disposition,
          outputRefs,
        }),
      );

      if (record.disposition === "completed") {
        for (const ref of outputRefs) constituted.add(ref);
      }
    }
  }

  terminalHistory.sort((a, b) =>
    a.cause.trustRequestId.localeCompare(b.cause.trustRequestId),
  );

  return Object.freeze({
    root: Object.freeze({
      trustId: input.root.trustId,
      authorityCut: input.root.authorityCut,
    }),
    constitutedRefs: uniqueSorted(constituted),
    terminalHistory: Object.freeze(terminalHistory),
    unresolved: Object.freeze([]),
    orphanObservations: Object.freeze([]),
    legalValidity: "unclaimed",
  });
}
```

The `terminalHistory` field is load-bearing: it prevents Session refusal, host failure, and completion from collapsing into an undifferentiated “spent” state.

- [ ] **Step 4: Run the focused test and verify GREEN**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs
git add tsconfig.kernel.json 2>/dev/null || true
git commit -m "feat: derive constituted world cut from balanced history"
```

---

### Task 2: Prove failed/refused history and pre-warrant non-transition

**Files:**
- Modify: `runtime/world-cut.ts`
- Modify: `tests/lawful-reachability.test.mjs`

**Interfaces:**
- Consumes: Task 1 `deriveWorldCut(...)`.
- Produces: distinct `host-failed`, `session-refused`, and `completed` terminal history; `unspent` remains non-terminal.

- [ ] **Step 1: Add the three disposition tests**

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

test("host failure advances history without manufacturing output", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("host-failed", "request:failed")],
    observations: [],
  });

  assert.deepEqual(world.terminalHistory.map((entry) => entry.disposition), [
    "host-failed",
  ]);
  assert.deepEqual(world.terminalHistory[0].outputRefs, []);
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});

test("Session refusal after spend advances a distinguishable history", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("session-refused", "request:refused")],
    observations: [],
  });

  assert.deepEqual(world.terminalHistory.map((entry) => entry.disposition), [
    "session-refused",
  ]);
  assert.deepEqual(world.terminalHistory[0].outputRefs, []);
});

test("unspent evidence is not a consequential state transition", () => {
  const world = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("unspent", "request:never-crossed")],
    observations: [],
  });

  assert.deepEqual(world.terminalHistory, []);
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});
```

- [ ] **Step 2: Run the focused test file**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS if Task 1 implemented the explicit disposition predicate correctly. Retain the tests even if they are green immediately; they are the regression proof for the three distinct historical semantics.

- [ ] **Step 3: Add one anti-collapse assertion**

```js
test("failure and Session refusal do not collapse into the same world cut", () => {
  const failed = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("host-failed", "request:same-cause")],
    observations: [],
  });
  const refused = deriveWorldCut({
    root,
    causalRecords: [terminalRecord("session-refused", "request:same-cause")],
    observations: [],
  });

  assert.notDeepEqual(failed, refused);
});
```

Run the focused test again; expected PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/lawful-reachability.test.mjs runtime/world-cut.ts
git commit -m "test: preserve terminal reachability history"
```

---

### Task 3: Preserve orphan observations and refuse anomalous/broken-lineage edges

**Files:**
- Modify: `runtime/world-cut.ts`
- Modify: `tests/lawful-reachability.test.mjs`

**Interfaces:**
- Consumes: Causal Accounting anomaly vocabulary.
- Produces: deterministic `orphanObservations[]` and `unresolved[]`; anomaly and foreign-root records never constitute refs or terminal history.

- [ ] **Step 1: Add orphan-observation test**

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
  assert.equal(world.constitutedRefs.includes("session-output:mystery-9999"), false);
});
```

- [ ] **Step 2: Add anomaly and broken-lineage tests**

```js
for (const anomalyCode of [
  "ORPHAN_EFFECT",
  "DOUBLE_SPEND",
  "SUBSTITUTED_CONSEQUENCE",
  "BROKEN_LINEAGE",
]) {
  test(`${anomalyCode} cannot constitute state`, () => {
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
    assert.deepEqual(world.terminalHistory, []);
    assert.deepEqual(world.unresolved, [
      {
        classification: "UNRESOLVED",
        anomalyCode,
        trustRequestId: anomalous.cause.trustRequestId,
      },
    ]);
  });
}

test("balanced record from another authority cut cannot bridge worlds", () => {
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

  assert.deepEqual(world.terminalHistory, []);
  assert.equal(world.constitutedRefs.includes("session-output:foreign-cut"), false);
  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "BROKEN_LINEAGE",
      trustRequestId: "request:foreign-cut",
    },
  ]);
});
```

- [ ] **Step 3: Run and verify RED**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: FAIL because orphan/unresolved classification is not implemented yet.

- [ ] **Step 4: Implement explicit non-constituting classifications**

Inside `deriveWorldCut(...)`, create `unresolved: ReachabilityIssue[] = []` and evaluate lineage/anomaly before balanced transition handling:

```ts
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
```

After closure:

```ts
const orphanObservations = uniqueSorted(input.observations)
  .filter((ref) => !constituted.has(ref))
  .map((ref) =>
    Object.freeze({
      ref,
      classification: "ORPHAN_OBSERVATION" as const,
    }),
  );

unresolved.sort((a, b) =>
  (a.trustRequestId ?? "").localeCompare(b.trustRequestId ?? "") ||
  (a.anomalyCode ?? "").localeCompare(b.anomalyCode ?? ""),
);
```

Return frozen copies of both arrays.

- [ ] **Step 5: Run and verify GREEN**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs
git commit -m "feat: preserve orphan and unresolved world state"
```

---

### Task 4: Prove deterministic re-entry, immutability, non-authority, and integrate the gate

**Files:**
- Modify: `tests/lawful-reachability.test.mjs`
- Modify: `runtime/world-cut.ts` only if ordering/freezing tests expose a defect
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/corpus-trust-runtime-v0.1.md` only if it remains the execution-boundary record after #17 lands

**Interfaces:**
- Consumes: completed `deriveWorldCut(...)`.
- Produces: deterministic structural re-entry proof, input-order independence, immutable returned projection, no authority methods, `npm run test:reachability`, and inclusion in `npm run check`.

- [ ] **Step 1: Add re-entry and order-independence tests**

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

test("input insertion order does not change the world projection", () => {
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

- [ ] **Step 2: Add immutability and non-authority tests**

```js
test("derivation mutates no supplied evidence", () => {
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

  assert.deepEqual({ mutableRoot, mutableRecord, observations }, before);
});

test("WorldCut is frozen projection data with no authority/execution surface", () => {
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
  assert.equal(Object.isFrozen(world.terminalHistory), true);
  assert.equal(Object.isFrozen(world.unresolved), true);
  assert.equal(Object.isFrozen(world.orphanObservations), true);
});
```

- [ ] **Step 3: Run focused tests**

```bash
npm run build:kernel
node --test tests/lawful-reachability.test.mjs
```

Expected: PASS. If order independence fails, sort `terminalHistory` by `cause.trustRequestId`, `unresolved` by request/anomaly, and all ref arrays lexically. Do not add a hash or serializer.

- [ ] **Step 4: Add the dedicated npm command**

In `package.json` add:

```json
"test:reachability": "npm run build:kernel && node --test tests/lawful-reachability.test.mjs"
```

Insert `npm run test:reachability` into the existing `check` chain after the Causal Accounting test command introduced by #17 and before final build/lint stages. Preserve other command order.

- [ ] **Step 5: Document the bounded claim**

Add to `docs/architecture.md`:

```markdown
## Lawful Reachability / Constituted Reality v0.1

Corpus distinguishes observed substrate from constituted state.

A pure `deriveWorldCut(...)` projection starts from the adopted declaration root and traverses only balanced Causal Accounting records under the exact adopted authority cut. Completed consequences may add output refs to constituted state. Session refusal after warrant spend and host failure remain distinguishable terminal history without manufacturing successful outputs. Observed refs with no accountable ancestry remain explicit `ORPHAN_OBSERVATION` entries.

The projection grants no authority, reaches no host, repairs nothing, and carries `legalValidity: "unclaimed"`. It has no canonical world hash or portable identity claim.
```

Add near the README's authority progression:

```markdown
> Existence is observed. Reality is constituted. History is the lawful path between them.

> A state belongs to the constituted present only when Corpus can derive a balanced causal path to it from the adopted root; unsupported observations remain visible without silently becoming history.
```

- [ ] **Step 6: Run the dedicated and full gates**

```bash
npm run test:reachability
npm run check
git diff --check
```

Expected: all PASS; `git diff --check` produces no output.

- [ ] **Step 7: Inspect for forbidden scope**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- runtime/world-cut.ts tests/lawful-reachability.test.mjs package.json README.md docs/architecture.md docs/corpus-trust-runtime-v0.1.md
```

Confirm the diff contains no host/Session execution from `world-cut.ts`, canonical world hash, signing/PKI, portable warrants, database/persistence, second event store, counterfactual executor, prospective scheduler, automatic repair/deletion, or legal-validity adjudication.

- [ ] **Step 8: Commit integration/docs**

```bash
git add runtime/world-cut.ts tests/lawful-reachability.test.mjs package.json README.md docs/architecture.md
git add docs/corpus-trust-runtime-v0.1.md 2>/dev/null || true
git commit -m "docs: record constituted reality proof boundary"
```

---

## Final verification gate

- [ ] Run:

```bash
npm run check
git diff --check
git status --short
```

Expected: `npm run check` passes, `git diff --check` is silent, and `git status --short` is empty after commits.

- [ ] Re-read `docs/superpowers/specs/2026-08-15-lawful-reachability-design.md` and verify every v0.1 acceptance item has an executable test or explicit bounded documentation statement.
- [ ] Confirm `runtime/world-cut.ts` imports no host adapter, `CorpusSession`, `WarrantedCorpusSession`, warrant-consumption function, filesystem/database module, cryptographic signer, or canonical serializer.
- [ ] Confirm the final PR claims only deterministic constituted-world derivation from supplied accountable evidence—not authenticity of arbitrary persisted history and not prevention of external mutation.
