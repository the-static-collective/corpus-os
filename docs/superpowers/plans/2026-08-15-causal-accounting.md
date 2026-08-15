# Causal Accounting / Linear Authority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that every Corpus consequence-producing attempt reconciles to exactly one legitimately spent Action Warrant and every spent warrant terminates in an inspectable disposition, while anomalous causal histories remain explicit rather than repaired.

**Architecture:** Keep authority and execution in their existing modules. Add only two small observability seams: read-only warrant spend-state inspection in `runtime/action-warrant.ts`, and a causal binding snapshot on each `LaunchReceipt` in `runtime/launch.ts`. Build `runtime/causal-accounting.ts` as a pure derived view over issued warrants plus attempt/receipt evidence; it must not mint authority, persist history, canonicalize JSON, mutate source evidence, or define lawful reachability.

**Tech Stack:** TypeScript, Node 22 `node:test`, existing Corpus runtime and CI.

## Global Constraints

- Remain entirely in-process and synthetic.
- No persistence, canonical serialization, signatures, token economics, portable warrants, network authority, or second event store.
- The adopted declaration root from #16 remains authoritative; #17 consumes it and does not redefine adoption.
- One genuine issued warrant may be spent at most once at the Session consequence boundary.
- `spent` is resource state, not terminal history; balanced history must preserve `unspent`, `session-refused`, `host-failed`, and `completed` distinctly.
- Anomalies are computational integrity states only; make no legal-validity, fraud, financial-accounting, or jurisdiction-specific claim.
- Reconciliation must be pure and must not mutate declarations, adopted handles, warrants, receipts, or caller-provided evidence arrays.
- Do not implement issue #20 / Lawful Reachability / `WorldCut` in this slice.

---

### Task 1: Make spend state and terminal binding inspectable without widening authority

**Files:**
- Modify: `runtime/action-warrant.ts`
- Modify: `runtime/launch.ts`
- Test: `tests/causal-accounting.test.mjs`

**Interfaces:**
- Produces: `inspectActionWarrantState(value): "invalid" | "unspent" | "spent"`.
- Produces: `LaunchCausalBinding` and `LaunchReceipt.causalBinding` containing exact warrant-bound `trustId`, `authorityCut`, `subjectRef`, `capabilityId`, `capabilityOperation`, `capabilityOwner`, `trustRequestId`, and `operationInput`.
- These values are evidence only; neither interface may consume, issue, or reproduce executable authority.

- [ ] **Step 1: Write the failing tests**

Add focused assertions to `tests/causal-accounting.test.mjs` that:

```js
import * as actionWarrant from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { CorpusSession } from "../.kernel-dist/runtime/session.js";
import { WarrantedCorpusSession } from "../.kernel-dist/runtime/warranted-session.js";

assert.equal(typeof actionWarrant.inspectActionWarrantState, "function");
```

and, after issuing then executing a warrant through a recording host:

```js
assert.equal(actionWarrant.inspectActionWarrantState(warrant), "spent");
assert.deepEqual(result.execution.launch.receipt.causalBinding, {
  trustId: declaration.id,
  authorityCut: declaration.version,
  subjectRef: "artifact:agreement-a",
  capabilityId: "synthetic.echo",
  capabilityOperation: "echo",
  capabilityOwner: "fixture.synthetic-runtime",
  trustRequestId: "request:causal-001",
  operationInput: "causal input",
});
```

Also prove a newly issued but unexecuted warrant reports `unspent`, and a spread copy reports `invalid`.

- [ ] **Step 2: Run the focused test and verify RED**

Run through CI on the test-only commit. Expected: assertion failure because `inspectActionWarrantState` and `causalBinding` do not yet exist; no host or authority invariant should regress.

- [ ] **Step 3: Implement minimal read-only evidence seams**

In `runtime/action-warrant.ts`, add:

```ts
export type ActionWarrantState = "invalid" | "unspent" | "spent";

export function inspectActionWarrantState(value: unknown): ActionWarrantState {
  if (!isIssuedActionWarrant(value)) return "invalid";
  return consumedWarrants.has(value) ? "spent" : "unspent";
}
```

In `runtime/launch.ts`, add:

```ts
export interface LaunchCausalBinding {
  trustId: string;
  authorityCut: string;
  subjectRef: string;
  capabilityId: string;
  capabilityOperation: string;
  capabilityOwner: string;
  trustRequestId: string;
  operationInput: string;
}
```

Add `causalBinding: LaunchCausalBinding` to `LaunchReceipt`, derive it only from the consumed genuine warrant, and include the same binding on Session refusal, host failure, and completion receipts.

- [ ] **Step 4: Run focused and existing warrant/session tests**

Run:

```bash
npm run test:session
npm run test:warrant
```

Expected: all pass, including the new causal-binding assertions.

- [ ] **Step 5: Commit**

Commit message:

```text
feat: expose causal warrant disposition evidence
```

---

### Task 2: Derive balanced causal history as a pure view

**Files:**
- Create: `runtime/causal-accounting.ts`
- Test: `tests/causal-accounting.test.mjs`

**Interfaces:**
- Consumes: genuine issued warrant objects, `inspectActionWarrantState`, and attempt evidence `{ warrant, receipt }`.
- Produces:

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
  | "BROKEN_LINEAGE"
  | "MISSING_DISPOSITION";

export interface CausalAttemptEvidence {
  readonly warrant?: unknown;
  readonly receipt: LaunchReceipt;
}

export interface CausalEntry {
  readonly warrant: Readonly<ActionWarrant>;
  readonly disposition: CausalDisposition | null;
  readonly receipts: readonly LaunchReceipt[];
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCodes: readonly CausalAnomalyCode[];
}

export interface CausalReconciliation {
  readonly entries: readonly CausalEntry[];
  readonly orphanEffects: readonly LaunchReceipt[];
  readonly balanced: boolean;
}

export function reconcileCausalHistory(input: {
  warrants: readonly unknown[];
  attempts: readonly CausalAttemptEvidence[];
}): CausalReconciliation;
```

- [ ] **Step 1: Extend the test file with a guarded module-existence RED test**

Load the new module dynamically so the first run is an assertion failure rather than an unhandled import error:

```js
let accounting = null;
try {
  accounting = await import("../.kernel-dist/runtime/causal-accounting.js");
} catch {}

test("causal accounting module is executable", () => {
  assert.ok(accounting);
});
```

Skip later accounting tests when `accounting` is null.

- [ ] **Step 2: Specify all four ordinary dispositions**

Use genuine adopted warrants and recording hosts to prove:

```text
issued + no attempt       -> unspent
Session refusal           -> session-refused
host failure              -> host-failed
host completion           -> completed
```

For each balanced entry assert `balance === "balanced"`, `anomalyCodes` is empty, and the preserved `warrant.authorityCut` remains the adopted cut.

- [ ] **Step 3: Verify RED on the test-only commit**

Expected: only the module-existence assertion fails; existing tests stay green.

- [ ] **Step 4: Implement the minimal pure reconciler**

Rules:

1. Ignore invalid/copy warrant representations in the issued-warrant set; they may not become causal authority.
2. Group attempt evidence only by genuine issued warrant object identity.
3. Attempts with absent/invalid warrant references are `ORPHAN_EFFECT` and cannot balance any warrant.
4. Zero attempts + `unspent` warrant => balanced `unspent`.
5. Zero attempts + `spent` warrant => anomalous entry with `disposition: null` and `MISSING_DISPOSITION`.
6. More than one attempt for one warrant => `DOUBLE_SPEND`.
7. Compare `receipt.causalBinding.capabilityId`, `capabilityOperation`, `capabilityOwner`, `subjectRef`, `trustRequestId`, and `operationInput` to the warrant; any mismatch => `SUBSTITUTED_CONSEQUENCE`.
8. Compare `receipt.causalBinding.trustId` and `authorityCut` to the warrant; any mismatch => `BROKEN_LINEAGE`.
9. For a single non-anomalous attempt, map receipt state exactly:
   - `admitted === false && status === "refused"` => `session-refused`;
   - `admitted === true && status === "failed"` => `host-failed`;
   - `admitted === true && status === "completed"` => `completed`.
10. Freeze only newly derived reconciliation objects/arrays; never mutate caller evidence.

- [ ] **Step 5: Run the focused accounting tests**

Run:

```bash
npm run build:kernel
node --test tests/causal-accounting.test.mjs
```

Expected: all ordinary disposition tests pass.

- [ ] **Step 6: Commit**

Commit message:

```text
feat: reconcile spent authority to terminal history
```

---

### Task 3: Prove anomaly detection and non-mutation

**Files:**
- Modify: `tests/causal-accounting.test.mjs`
- Modify only if required by a failing test: `runtime/causal-accounting.ts`

**Interfaces:**
- No new authority interfaces.
- The anomaly vocabulary is exactly computational integrity vocabulary.

- [ ] **Step 1: Write failing anomaly tests**

Add one focused test each for:

- `ORPHAN_EFFECT`: an otherwise receipt-shaped consequence with no genuine issued warrant reference;
- `DOUBLE_SPEND`: two consequence attempts associated with the same genuine warrant;
- `SUBSTITUTED_CONSEQUENCE`: clone an authentic receipt evidence object, keep lineage, change `operationInput` or capability operation, and associate it with the genuine warrant;
- `BROKEN_LINEAGE`: clone an authentic receipt evidence object, change `authorityCut`, and associate it with the genuine warrant;
- `MISSING_DISPOSITION`: spend a genuine warrant through Session, then reconcile the warrant with an intentionally omitted attempt record.

Also snapshot the input warrant fields, receipt fields, and input array order before reconciliation and assert deep equality afterward.

- [ ] **Step 2: Run focused tests and verify RED where behavior is missing**

Expected: each newly specified anomaly fails until the reconciler represents it explicitly; no test may require automatic repair.

- [ ] **Step 3: Make the smallest reconciler corrections**

Only amend `runtime/causal-accounting.ts` to satisfy the failing invariant. Do not add persistence, ids, signing, canonicalization, or #20 world projection.

- [ ] **Step 4: Run accounting + session + warrant tests**

Run:

```bash
npm run build:kernel
node --test tests/causal-accounting.test.mjs
npm run test:session
npm run test:warrant
```

Expected: all pass.

- [ ] **Step 5: Commit**

Commit message:

```text
test: prove causal accounting anomaly states
```

---

### Task 4: Integrate the proof into repository checks and documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/superpowers/specs/2026-08-15-causal-accounting-design.md`

**Interfaces:**
- Produces a dedicated `npm run test:causal` command.
- `npm run check` must include `test:causal` after warrant/session prerequisites and before final build verification.

- [ ] **Step 1: Add the dedicated test command**

Add:

```json
"test:causal": "npm run build:kernel && node --test tests/causal-accounting.test.mjs"
```

and include `npm run test:causal` in `check`.

- [ ] **Step 2: Update documentation without claiming #20**

Document only these landed claims:

```text
adopted authority
  -> issued warrant
  -> spent/unspent resource state
  -> terminal Session/host disposition
  -> pure causal reconciliation
  -> explicit anomaly or balanced history
```

State explicitly that:

- `spent` does not collapse `session-refused`, `host-failed`, and `completed`;
- pre-warrant refusal creates no executable warrant and no Session/host consequence under this boundary;
- the proof is local/in-process and does not prove global non-action;
- Lawful Reachability / constituted state remains downstream in #20.

Mark the causal-accounting design status as implemented by #17 only after checks pass.

- [ ] **Step 3: Run the full repository contract**

Run:

```bash
npm run check
```

Expected: PASS with lint, all runtime/kernel/browser/build checks, and causal accounting tests green.

- [ ] **Step 4: Commit**

Commit message:

```text
docs: record balanced causal history proof
```

---

### Task 5: Review, CI, and handoff to #20

**Files:**
- No product-code changes unless review finds an in-scope defect.

- [ ] **Step 1: Open a draft PR linked to #17**

PR body must state:

- meaning-contract effect;
- fixtures changed (`none` unless that changes during implementation);
- checks run;
- compatibility effect;
- unresolved tensions;
- explicit non-goal that #20 remains unimplemented.

- [ ] **Step 2: Run bounded automated review**

Mark ready only after local/CI evidence is green. Resolve only valid in-scope findings; split adjacent ideas rather than widening #17.

- [ ] **Step 3: Verify final readiness**

Require exact final head, green required checks, zero unresolved in-scope review threads, and no regression in #16's adopted/warrant boundary.

- [ ] **Step 4: Stop at ready-to-merge unless current-head landing is explicitly approved**

Do not merge solely because prior work or a prior head was approved.

## Self-review

- Spec coverage: ordinary dispositions, copied-warrant invalidity, pre-warrant non-action, all required anomaly codes, preserved authority cut, and non-mutation each have a test task.
- Scope control: no durable ledger, portable identity, signatures, canonical JSON, temporal authority law, UI, automatic repair, or Lawful Reachability implementation is introduced.
- Type consistency: `LaunchCausalBinding`, `inspectActionWarrantState`, `CausalDisposition`, `CausalAnomalyCode`, `CausalAttemptEvidence`, `CausalEntry`, `CausalReconciliation`, and `reconcileCausalHistory` are defined once and reused consistently.
