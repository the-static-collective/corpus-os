# Adopted Declaration Root / Mandatory Consequence Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Corpus OS prove that executable warrants originate only from one code-owned adopted declaration cut and that host consequence cannot be reached through bare Session invocation.

**Architecture:** Add a module-private adopted-declaration registry keyed by exact code-owned declaration bytes, then require that adopted handle for warrant issuance. Move warrant consumption to the Session host-reaching boundary: `CorpusSession.run(...)` accepts only a genuine issued Action Warrant, consumes it before capability admission, derives capability/operation/input from the warrant, and refuses copies/replays before host execution.

**Tech Stack:** Node.js 22+, TypeScript 5.9, Node `crypto`, Node test runner, existing Corpus Session / Trust Runtime / bounded Linux host port.

## Global Constraints

- Preserve `legalValidity: "unclaimed"`; do not make legal-validity claims.
- Do not add canonical JSON identity, signatures, seals, PKI, persistence, network authority, or a second identity law.
- Resolve adopted fixture paths from module location, never caller `process.cwd()`.
- The adopted synthetic declaration is identified by exact SHA-256 over checked-in UTF-8 file bytes: `13ca707bad7ad089cce441de02270f8b7738fa4e8b1ca3cdf19420b8c6cf6a78`, trust id `trust:synthetic-casework-001`, authority cut `0.1`.
- A copied/spread/JSON/`structuredClone` adoption handle or warrant representation is never executable authority.
- Session refusal and host failure consume a genuine warrant exactly once.
- Lower-level Session inspection (`open`, `capabilities`) remains usable; no test-only authority minting backdoor is permitted.
- Run `npm run check` before declaring the PR ready.

---

### Task 1: Prove and implement the local adopted declaration root

**Files:**
- Create: `runtime/adopted-declaration.ts`
- Create: `tests/adopted-declaration.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `loadAdoptedDeclaration(): Promise<AdoptionResult>`
- Produces: `isAdoptedDeclaration(value: unknown): value is Readonly<AdoptedDeclaration>`
- Produces: `declarationForAdoptedHandle(handle): Readonly<CorpusTrustDeclaration> | undefined`
- `AdoptedDeclaration` exposes only inspectable evidence fields: `kind`, `trustId`, `authorityCut`, `rawSha256`, `legalValidity`.

- [ ] **Step 1: Write failing adoption tests**

Add tests that require the exact checked-in fixture to load as one adopted cut, assert `rawSha256`, id, version, frozen handle, and `legalValidity: "unclaimed"`; require spread/JSON/structured clones to fail `isAdoptedDeclaration`; and exercise an injected-byte verification helper with one-byte-modified but structurally valid JSON so the result is `ADOPTED_DECLARATION_BYTES_MISMATCH`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run build:kernel && node --test tests/adopted-declaration.test.mjs`

Expected RED: module/API missing, with existing unrelated suites unaffected.

- [ ] **Step 3: Implement the minimum adoption root**

Create `runtime/adopted-declaration.ts` using `readFile`, `createHash("sha256")`, module-relative `new URL("../../fixtures/trusts/casework.synthetic.json", import.meta.url)`, existing `validateTrustDeclaration`, a module-private `WeakMap<object, Readonly<CorpusTrustDeclaration>>`, and deep-freezing of the parsed declaration before registry insertion.

Required decision codes:
- `ADOPTED_DECLARATION_ADOPTED`
- `ADOPTED_DECLARATION_BYTES_MISMATCH`
- `ADOPTED_DECLARATION_ID_MISMATCH`
- `ADOPTED_DECLARATION_CUT_MISMATCH`
- `ADOPTED_DECLARATION_INVALID`
- `ADOPTED_DECLARATION_PARSE_FAILED`

- [ ] **Step 4: Add the adoption test gate**

Add `test:adoption` to `package.json` and include it in `npm run check` before `test:warrant`.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test:adoption`
Expected: all adoption tests pass.

- [ ] **Step 6: Commit**

Commit message: `feat: establish code-owned adopted declaration root`

---

### Task 2: Require adopted authority for Action Warrant issuance

**Files:**
- Modify: `runtime/action-warrant.ts`
- Modify: `runtime/warranted-session.ts`
- Modify: `tests/warranted-execution.test.mjs`

**Interfaces:**
- `admitActionWarrant(adopted: unknown, request: TrustOperationRequest, operationInput: string): ActionWarrantAdmission`
- Add admission code `ACTION_WARRANT_DECLARATION_NOT_ADOPTED`.
- `ActionWarrantAdmission.trustReceipt` becomes optional only for the pre-Trust non-adopted rejection path.
- `WarrantedCorpusSession` constructor accepts a genuine adopted handle plus `CorpusSession`.

- [ ] **Step 1: Write failing authority-root tests**

Replace test setup that passes naked declaration JSON with `loadAdoptedDeclaration()`. Add a self-granting structurally valid declaration specimen and prove it cannot mint a warrant; add copied adoption-handle cases and prove they return `ACTION_WARRANT_DECLARATION_NOT_ADOPTED` with no Session receipt and no host call.

- [ ] **Step 2: Run focused warrant tests and verify RED**

Run: `npm run test:warrant`
Expected RED: current API still accepts naked declarations / lacks adoption checks.

- [ ] **Step 3: Implement adopted-only warrant issuance**

Use `isAdoptedDeclaration` and `declarationForAdoptedHandle` before calling `evaluateTrustOperation`. Preserve all existing subject/capability/input binding and issuance `WeakSet` behavior. Keep `legalValidity: "unclaimed"`.

- [ ] **Step 4: Update `WarrantedCorpusSession` authority-cut checks**

Read trust id/cut from the genuine adopted handle, not a caller declaration. Keep fail-closed mismatch behavior before Session crossing.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test:adoption && npm run test:warrant`
Expected: all adoption + warrant tests pass.

- [ ] **Step 6: Commit**

Commit message: `feat: mint warrants only from adopted authority`

---

### Task 3: Make Session itself the mandatory warranted consequence boundary

**Files:**
- Modify: `runtime/action-warrant.ts`
- Modify: `runtime/session.ts`
- Modify: `runtime/warranted-session.ts`
- Modify: `tests/corpus-session.test.mjs`
- Modify: `tests/warranted-execution.test.mjs`
- Modify: `scripts/corpus-session.ts`

**Interfaces:**
- Add to `runtime/action-warrant.ts`: `consumeIssuedActionWarrant(value: unknown)` returning `{ status: "consumed", warrant } | { status: "invalid" } | { status: "already-consumed" }`.
- `CorpusSession.run(warrant: unknown)` becomes the only host-reaching Session method.
- `CorpusSession.run` derives `capabilityId`, `capabilityOperation`, `capabilityOwner`, and `operationInput` exclusively from the consumed warrant.
- Invalid/copy/replay attempts return a Session-level non-host result and never call `CorpusHostPort.execute`.

- [ ] **Step 1: Write failing mandatory-boundary tests**

Add proofs that:
1. legacy `session.run("synthetic.echo", "echo", "payload")` can no longer produce a host consequence;
2. a copied warrant cannot reach the host;
3. one valid warrant creates only one Session receipt/host attempt;
4. Session refusal spends the warrant;
5. host failure spends the warrant;
6. capability owner mismatch is terminal after the warrant crosses Session and cannot be retried.

- [ ] **Step 2: Run focused Session + warrant tests and verify RED**

Run: `npm run test:session && npm run test:warrant`
Expected RED: current Session still accepts free capability/op/input and current spend state lives above Session.

- [ ] **Step 3: Move consumption into the Action Warrant module and Session boundary**

Keep issuance and consumption registries private to `runtime/action-warrant.ts`. `CorpusSession.run` calls `consumeIssuedActionWarrant` before capability lookup/admission. Remove the wrapper-local consumed `WeakSet`.

- [ ] **Step 4: Bind Session execution to warrant fields**

After successful consumption, resolve the capability registry entry, require exact owner match, then call existing `launchCapability` with the warrant-bound id/op/input. Session refusal or host failure remains a terminal receipt and never restores the warrant.

- [ ] **Step 5: Migrate existing Session tests and CLI without adding a bypass**

Keep `open()` and `capabilities()` direct. For actual host execution tests/CLI, load the adopted root, admit a genuine Action Warrant, then pass that warrant to Session/Warranted Session. Do not add `unsafeRun`, `runForTest`, a secret symbol, or any raw host-reaching helper.

- [ ] **Step 6: Verify GREEN**

Run: `npm run test:session && npm run test:warrant && npm run test:adoption`
Expected: all focused suites pass.

- [ ] **Step 7: Commit**

Commit message: `feat: require warrants at Session consequence boundary`

---

### Task 4: Reconcile documentation and run the full repository gate

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/corpus-trust-runtime-v0.1.md`
- Modify as needed: `package.json`, `scripts/corpus-session.ts`

**Interfaces:**
- Documentation must describe adopted local authority and mandatory warranted host consequence without claiming portable identity, legal validity, or Causal Accounting.

- [ ] **Step 1: Update docs to match executable reality**

Document:
- code-owned exact-byte adopted declaration cut;
- private in-process adoption/warrant authority;
- Session host consequence requires a genuine warrant;
- refusal/failure consume a warrant once it crosses Session;
- #17 Causal Accounting remains a separate post-#16 follow-up.

- [ ] **Step 2: Run focused checks**

Run:
- `npm run test:adoption`
- `npm run test:warrant`
- `npm run test:session`

Expected: PASS.

- [ ] **Step 3: Run the required full gate**

Run: `npm run check`
Expected: PASS with no new lint errors; the pre-existing `_data` warning in `tests/intake-browser.test.mjs` may remain.

- [ ] **Step 4: Review the effective diff for scope**

Confirm no canonicalizer, signature/seal, persistence, legal-validity claim, Causal Accounting implementation, new host adapter, or unrelated refactor entered the branch.

- [ ] **Step 5: Commit documentation if changed after Task 3**

Commit message: `docs: record adopted warranted consequence boundary`

- [ ] **Step 6: Open/update PR**

PR title: `Establish adopted declaration root and mandatory warranted execution`

PR body must include `Closes #16`, meaning-contract effect, fixtures changed, checks run, compatibility effect, and unresolved tension that declaration succession/revocation and Causal Accounting remain future work.
