# Latent Reachability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-consuming prospective inspection that reports whether one genuine Action Warrant can still cross the Session attempt boundary from the current constituted `WorldCut`, without executing, consuming authority, or predicting outcomes.

**Architecture:** Extract the capability rule checks currently embedded in `evaluateCapabilityAdmission(...)` into a pure shared `evaluateCapabilityPolicy(...)`. Add `runtime/latent-reachability.ts` downstream of `WorldCut`, genuine warrant state, and that shared policy. The new surface returns only attempt eligibility or an explicit block code and never returns the warrant, operation input, receipt, host observation, or predicted output.

**Tech Stack:** TypeScript 5.9, Node.js >=22.13.0, Node built-in test runner, existing Corpus OS runtime modules and npm verification gate.

## Global Constraints

- `ATTEMPT_REACHABLE` means only present attempt eligibility; it never means Session admission, host success, output existence, or constituted future state.
- Inspection must never call `consumeIssuedActionWarrant(...)`, `launchCapability(...)`, or a host port.
- Copied/spread/JSON/structured-cloned warrant-shaped objects must remain non-authority.
- A genuine warrant must be unspent, match `worldCut.root.trustId` + `authorityCut`, target a ref in `worldCut.constitutedRefs`, and pass the same capability policy used by Session.
- Reachable output must explicitly say `outcome: "unknown-until-attempted"` and `legalValidity: "unclaimed"`.
- Invalid/forged input must fail closed before any supplied warrant fields are trusted.
- No scheduler, counterfactual world simulator, predicted host result, output-ref prediction, durable future ledger, signature/portable authority, or legal-validity claim.

---

### Task 1: Extract the pure capability-policy seam

**Files:**
- Modify: `runtime/launch.ts`
- Create: `tests/capability-policy.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ReadonlyMap<string, Readonly<CapabilityDescriptor>>`, `Readonly<ActionWarrant>`.
- Produces:

```ts
export type CapabilityPolicyResult =
  | {
      readonly admitted: true;
      readonly capability: Readonly<CapabilityDescriptor>;
    }
  | {
      readonly admitted: false;
      readonly code: RefusalCode;
      readonly capabilityId: string;
      readonly owner: string | null;
    };

export function evaluateCapabilityPolicy(
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  warrant: Readonly<ActionWarrant>,
): CapabilityPolicyResult;
```

`evaluateCapabilityAdmission(...)` must call this function and preserve its current refusal-receipt semantics exactly.

- [ ] **Step 1: Write the failing policy tests**

Create `tests/capability-policy.test.mjs` with a minimal synthetic registry and warrant. Require the new export and prove all current refusal classes remain distinct:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCapabilityPolicy } from "../.kernel-dist/runtime/launch.js";

const capability = Object.freeze({
  id: "synthetic.echo",
  owner: "fixture.synthetic-runtime",
  authority: "execution",
  transport: "local-process",
  allows: Object.freeze(["echo"]),
  nonAuthority: Object.freeze(["inspect"]),
});

const baseWarrant = Object.freeze({
  kind: "corpus-action-warrant-v0.1",
  trustId: "trust:synthetic-casework-001",
  authorityCut: "0.1",
  actorId: "person:administrator",
  capacity: "administrator",
  purpose: "synthetic",
  subjectRef: "artifact:agreement-a",
  capabilityId: "synthetic.echo",
  capabilityOperation: "echo",
  capabilityOwner: "fixture.synthetic-runtime",
  trustRequestId: "request:latent-policy",
  operationInput: "bounded input",
  legalValidity: "unclaimed",
});

const registry = new Map([[capability.id, capability]]);

test("pure capability policy admits the same executable capability", () => {
  const result = evaluateCapabilityPolicy(registry, baseWarrant);
  assert.equal(result.admitted, true);
  assert.equal(result.capability, capability);
});

test("pure capability policy preserves refusal codes", () => {
  assert.equal(
    evaluateCapabilityPolicy(new Map(), baseWarrant).code,
    "CAPABILITY_NOT_FOUND",
  );
  assert.equal(
    evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOwner: "wrong.owner" }),
    ).code,
    "CAPABILITY_OWNER_MISMATCH",
  );
  assert.equal(
    evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOperation: "inspect" }),
    ).code,
    "CAPABILITY_NON_AUTHORITY",
  );
  assert.equal(
    evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOperation: "delete" }),
    ).code,
    "CAPABILITY_OPERATION_NOT_ALLOWED",
  );
});
```

- [ ] **Step 2: Run the focused RED test**

Run:

```bash
npm run build:kernel && node --test tests/capability-policy.test.mjs
```

Expected: FAIL because `evaluateCapabilityPolicy` is not exported.

- [ ] **Step 3: Implement the minimal pure policy evaluator**

In `runtime/launch.ts`, move the registry/owner/non-authority/allowed-operation checks into `evaluateCapabilityPolicy(...)`. Do not construct receipts or read host state there. The final `echo` restriction remains part of policy because current Session behavior treats every other operation as refused.

Core shape:

```ts
export function evaluateCapabilityPolicy(
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  warrant: Readonly<ActionWarrant>,
): CapabilityPolicyResult {
  const capability = registry.get(warrant.capabilityId);
  if (!capability) {
    return {
      admitted: false,
      code: "CAPABILITY_NOT_FOUND",
      capabilityId: warrant.capabilityId,
      owner: null,
    };
  }
  if (capability.owner !== warrant.capabilityOwner) {
    return {
      admitted: false,
      code: "CAPABILITY_OWNER_MISMATCH",
      capabilityId: capability.id,
      owner: capability.owner,
    };
  }
  if (capability.nonAuthority.includes(warrant.capabilityOperation)) {
    return {
      admitted: false,
      code: "CAPABILITY_NON_AUTHORITY",
      capabilityId: capability.id,
      owner: capability.owner,
    };
  }
  if (
    !capability.allows.includes(warrant.capabilityOperation) ||
    warrant.capabilityOperation !== "echo"
  ) {
    return {
      admitted: false,
      code: "CAPABILITY_OPERATION_NOT_ALLOWED",
      capabilityId: capability.id,
      owner: capability.owner,
    };
  }
  return { admitted: true, capability };
}
```

Then make `evaluateCapabilityAdmission(...)` call `evaluateCapabilityPolicy(...)`; when blocked, pass the policy's `capabilityId`, `owner`, and `code` to the existing `refusal(...)` helper. When admitted, return `{ capability: policy.capability }`.

- [ ] **Step 4: Wire and run the policy regression**

Add `tests/capability-policy.test.mjs` to `test:session` in `package.json`, then run:

```bash
npm run test:session
```

Expected: PASS with all previous Session/warrant tests plus the new pure-policy tests.

- [ ] **Step 5: Commit**

```bash
git add runtime/launch.ts tests/capability-policy.test.mjs package.json
git commit -m "refactor: expose pure capability policy"
```

---

### Task 2: Prove one-warrant Latent Reachability

**Files:**
- Create: `runtime/latent-reachability.ts`
- Create: `tests/latent-reachability.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes:
  - `Readonly<WorldCut>` from `runtime/world-cut.ts`;
  - `inspectActionWarrantState(...)` + `isIssuedActionWarrant(...)` from `runtime/action-warrant.ts`;
  - `evaluateCapabilityPolicy(...)` + `RefusalCode` from `runtime/launch.ts`;
  - `ReadonlyMap<string, Readonly<CapabilityDescriptor>>`.
- Produces:

```ts
export type LatentReachabilityBlockCode =
  | "LATENT_WARRANT_INVALID"
  | "LATENT_WARRANT_SPENT"
  | "LATENT_BROKEN_LINEAGE"
  | "LATENT_SUBJECT_NOT_CONSTITUTED"
  | RefusalCode;

export type LatentReachability =
  | Readonly<{
      reachable: true;
      code: "ATTEMPT_REACHABLE";
      trustRequestId: string;
      subjectRef: string;
      capabilityId: string;
      capabilityOperation: string;
      outcome: "unknown-until-attempted";
      legalValidity: "unclaimed";
    }>
  | Readonly<{
      reachable: false;
      code: LatentReachabilityBlockCode;
      trustRequestId?: string;
      legalValidity: "unclaimed";
    }>;
```

- [ ] **Step 1: Write the failing Latent Reachability tests**

Create `tests/latent-reachability.test.mjs`. Use the real adopted declaration/warrant issuance path so the test holds genuine in-process authority rather than fixture-shaped objects:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  admitActionWarrant,
  consumeIssuedActionWarrant,
  inspectActionWarrantState,
} from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { loadCapabilityRegistry } from "../.kernel-dist/runtime/capability-registry.js";
import { inspectLatentReachability } from "../.kernel-dist/runtime/latent-reachability.js";

const adoption = await loadAdoptedDeclaration();
const registry = await loadCapabilityRegistry();

function request(id, overrides = {}) {
  return {
    requestId: id,
    trustId: adoption.handle.trustId,
    actorId: "person:administrator",
    capacity: "administrator",
    operation: "invoke-capability",
    targetScope: "capability",
    targetRef: "artifact:agreement-a",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    ...overrides,
  };
}

function issue(id, overrides = {}) {
  const admission = admitActionWarrant(
    adoption.handle,
    request(id, overrides),
    "latent bounded input",
  );
  assert.equal(admission.admitted, true);
  return admission.warrant;
}

function world(overrides = {}) {
  return Object.freeze({
    root: Object.freeze({
      trustId: adoption.handle.trustId,
      authorityCut: adoption.handle.authorityCut,
    }),
    constitutedRefs: Object.freeze(["artifact:agreement-a"]),
    terminalHistory: Object.freeze([]),
    unresolved: Object.freeze([]),
    orphanObservations: Object.freeze([]),
    legalValidity: "unclaimed",
    ...overrides,
  });
}
```

Required assertions:

```js
test("genuine unspent warrant is prospectively reachable without being consumed", () => {
  const warrant = issue("request:latent-happy");
  const result = inspectLatentReachability(world(), registry, warrant);

  assert.deepEqual(result, {
    reachable: true,
    code: "ATTEMPT_REACHABLE",
    trustRequestId: "request:latent-happy",
    subjectRef: "artifact:agreement-a",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    outcome: "unknown-until-attempted",
    legalValidity: "unclaimed",
  });
  assert.equal(inspectActionWarrantState(warrant), "unspent");
});

test("copied warrant representation is not latent authority", () => {
  const warrant = issue("request:latent-copy");
  for (const copy of [
    { ...warrant },
    JSON.parse(JSON.stringify(warrant)),
    structuredClone(warrant),
  ]) {
    assert.deepEqual(inspectLatentReachability(world(), registry, copy), {
      reachable: false,
      code: "LATENT_WARRANT_INVALID",
      legalValidity: "unclaimed",
    });
  }
});

test("spent warrant is not prospectively reachable", () => {
  const warrant = issue("request:latent-spent");
  assert.equal(consumeIssuedActionWarrant(warrant).status, "consumed");
  assert.equal(inspectLatentReachability(world(), registry, warrant).code, "LATENT_WARRANT_SPENT");
});
```

Also add explicit tests for:

```js
assert.equal(
  inspectLatentReachability(
    world({ root: Object.freeze({ trustId: adoption.handle.trustId, authorityCut: "foreign-cut" }) }),
    registry,
    issue("request:latent-lineage"),
  ).code,
  "LATENT_BROKEN_LINEAGE",
);

assert.equal(
  inspectLatentReachability(
    world({ constitutedRefs: Object.freeze([]) }),
    registry,
    issue("request:latent-subject"),
  ).code,
  "LATENT_SUBJECT_NOT_CONSTITUTED",
);
```

Create genuine warrants whose operation is `inspect` or otherwise policy-blocked by using a test-local registry variant with the same warrant fields only where the warrant issuance path permits them; preserve exact policy refusal codes. Finally assert a successful result contains none of:

```js
for (const forbidden of [
  "warrant",
  "operationInput",
  "receipt",
  "outputRefs",
  "hostObservation",
  "execute",
  "run",
  "consume",
]) {
  assert.equal(forbidden in result, false);
}
```

- [ ] **Step 2: Run the focused RED test**

Run:

```bash
npm run build:kernel && node --test tests/latent-reachability.test.mjs
```

Expected: FAIL because `.kernel-dist/runtime/latent-reachability.js` does not exist.

- [ ] **Step 3: Implement the minimal inspection module**

Create `runtime/latent-reachability.ts` with the following control flow:

```ts
export function inspectLatentReachability(
  worldCut: Readonly<WorldCut>,
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  warrant: unknown,
): Readonly<LatentReachability> {
  if (!isIssuedActionWarrant(warrant)) {
    return Object.freeze({
      reachable: false,
      code: "LATENT_WARRANT_INVALID",
      legalValidity: "unclaimed",
    });
  }

  if (inspectActionWarrantState(warrant) === "spent") {
    return blocked("LATENT_WARRANT_SPENT", warrant.trustRequestId);
  }

  if (
    warrant.trustId !== worldCut.root.trustId ||
    warrant.authorityCut !== worldCut.root.authorityCut
  ) {
    return blocked("LATENT_BROKEN_LINEAGE", warrant.trustRequestId);
  }

  if (!worldCut.constitutedRefs.includes(warrant.subjectRef)) {
    return blocked("LATENT_SUBJECT_NOT_CONSTITUTED", warrant.trustRequestId);
  }

  const policy = evaluateCapabilityPolicy(registry, warrant);
  if (!policy.admitted) {
    return blocked(policy.code, warrant.trustRequestId);
  }

  return Object.freeze({
    reachable: true,
    code: "ATTEMPT_REACHABLE",
    trustRequestId: warrant.trustRequestId,
    subjectRef: warrant.subjectRef,
    capabilityId: warrant.capabilityId,
    capabilityOperation: warrant.capabilityOperation,
    outcome: "unknown-until-attempted",
    legalValidity: "unclaimed",
  });
}
```

`blocked(...)` returns a frozen object containing only `reachable`, `code`, optional trusted `trustRequestId`, and `legalValidity`.

- [ ] **Step 4: Run focused GREEN and no-consumption repetitions**

Run:

```bash
npm run build:kernel && node --test tests/latent-reachability.test.mjs
```

Expected: PASS. The happy-path test must call `inspectLatentReachability(...)` at least twice and verify `inspectActionWarrantState(warrant) === "unspent"` after both calls.

- [ ] **Step 5: Wire the focused suite into the repository gate**

Add:

```json
"test:latent": "npm run build:kernel && node --test tests/latent-reachability.test.mjs"
```

and insert `npm run test:latent` after `npm run test:reachability` in `check`.

Run:

```bash
npm run test:latent
npm run check
```

Expected: both PASS; no existing Session, Causal Accounting, or Lawful Reachability behavior changes.

- [ ] **Step 6: Commit**

```bash
git add runtime/latent-reachability.ts tests/latent-reachability.test.mjs package.json
git commit -m "feat: prove latent reachability"
```

---

### Task 3: Document the new boundary and verify the exact head

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

**Interfaces:**
- Consumes: the executable behavior and vocabulary from Tasks 1–2.
- Produces: project-owned documentation that distinguishes constituted reality from prospective attempt eligibility.

- [ ] **Step 1: Add the governing statement to README**

Add a concise section after the Lawful Reachability material:

```md
### Latent Reachability

Corpus may inspect whether one genuine, unspent Action Warrant is presently eligible to cross the Session attempt boundary from a constituted `WorldCut`.

This inspection is prospective evidence only. It consumes no authority, calls no host, predicts no output, and cannot constitute a future state.

> Possible authority is not spent authority, and possible consequence is not constituted reality.
```

- [ ] **Step 2: Extend the architecture chain**

In `docs/architecture.md`, extend the existing authority/reachability progression with:

```text
adopted root
    ↓
linear warrant authority
    ↓
balanced causal history
    ↓
constituted WorldCut
    ↓
Latent Reachability inspection
    ↓
ATTEMPT_REACHABLE | explicit block

(no spend, no host call, no future state)
```

Document the exact block families: invalid representation, spent authority, broken lineage, unconstituted subject, and existing capability-policy refusal codes.

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run check
```

Expected: PASS at the exact implementation head.

- [ ] **Step 4: Review the effective diff for authority leakage**

Inspect the final diff and verify:

```text
- latent module never imports consumeIssuedActionWarrant or launchCapability
- no host port is imported
- reachable result contains no warrant object
- operationInput does not cross the latent boundary
- no predicted output ref is created
- existing launch receipt behavior is unchanged
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/architecture.md
git commit -m "docs: define latent reachability boundary"
```

---

## Completion gate

The feature is complete only when all of the following are true:

```text
1. exact branch head passes npm run check;
2. genuine unspent authority remains unspent after repeated latent inspection;
3. forged/copy-shaped authority fails closed;
4. prospective eligibility is tied to the exact constituted root and subject;
5. Session policy is shared rather than duplicated;
6. no receipt, host observation, operation input, output ref, or executable authority crosses the new projection;
7. README and architecture docs state that possibility is not constituted reality.
```
