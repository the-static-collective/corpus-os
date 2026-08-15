import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as actionWarrant from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { CorpusSession } from "../.kernel-dist/runtime/session.js";
import { WarrantedCorpusSession } from "../.kernel-dist/runtime/warranted-session.js";

let accounting = null;
try {
  accounting = await import("../.kernel-dist/runtime/causal-accounting.js");
} catch {}

const declaration = JSON.parse(
  await readFile(
    new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url),
    "utf8",
  ),
);

function request(overrides = {}) {
  return {
    requestId: "request:causal-001",
    trustId: declaration.id,
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

function recordingHost({ status = "completed" } = {}) {
  const calls = [];
  return {
    calls,
    port: {
      host: "linux",
      async execute(execution) {
        calls.push(structuredClone(execution));
        if (status === "failed") {
          return {
            status: "failed",
            failureCode: "HOST_PROCESS_EXIT_NONZERO",
            hostObservation: {
              platform: process.platform,
              exitCode: 23,
              signal: null,
            },
          };
        }
        return {
          status: "completed",
          output: `host:${execution.input}`,
          hostObservation: {
            platform: process.platform,
            exitCode: 0,
            signal: null,
          },
        };
      },
    },
  };
}

async function makeRuntime(hostPort) {
  const adoption = await loadAdoptedDeclaration();
  assert.equal(adoption.adopted, true);
  assert.ok(adoption.handle);

  const session = new CorpusSession(hostPort);
  await session.initialize();

  return {
    session,
    runtime: new WarrantedCorpusSession(adoption.handle, session),
  };
}

async function issuedAttempt({
  requestOverrides = {},
  input = "causal input",
  hostStatus = "completed",
  execute = true,
} = {}) {
  const host = recordingHost({ status: hostStatus });
  const { runtime, session } = await makeRuntime(host.port);
  const admission = runtime.admit(request(requestOverrides), input);
  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);

  if (!execute) {
    return {
      host,
      runtime,
      session,
      warrant: admission.warrant,
      receipt: undefined,
      execution: undefined,
    };
  }

  const execution = await runtime.execute(admission.warrant);
  assert.ok(execution.launch);
  return {
    host,
    runtime,
    session,
    warrant: admission.warrant,
    receipt: execution.launch.receipt,
    execution,
  };
}

test("issued Action Warrant spend state is inspectable without making copied representation authoritative", async () => {
  assert.equal(typeof actionWarrant.inspectActionWarrantState, "function");

  const { warrant } = await issuedAttempt({ execute: false });

  assert.equal(actionWarrant.inspectActionWarrantState(warrant), "unspent");
  assert.equal(actionWarrant.inspectActionWarrantState({ ...warrant }), "invalid");
});

test("Session terminal receipt preserves the exact warrant-bound causal fields and leaves authority spent", async () => {
  const { host, warrant, receipt, execution } = await issuedAttempt();

  assert.equal(execution.executed, true);
  assert.equal(actionWarrant.inspectActionWarrantState(warrant), "spent");
  assert.deepEqual(receipt.causalBinding, {
    trustId: declaration.id,
    authorityCut: declaration.version,
    subjectRef: "artifact:agreement-a",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    capabilityOwner: "fixture.synthetic-runtime",
    trustRequestId: "request:causal-001",
    operationInput: "causal input",
  });
  assert.equal(host.calls.length, 1);
});

test("causal accounting module is executable", () => {
  assert.ok(accounting);
});

test(
  "balanced history preserves unspent, session-refused, host-failed, and completed as distinct dispositions",
  { skip: accounting === null },
  async () => {
    const unspent = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-unspent" },
      input: "outstanding",
      execute: false,
    });
    const refused = await issuedAttempt({
      requestOverrides: {
        requestId: "request:causal-refused",
        capabilityId: "synthetic.transcribe",
        capabilityOperation: "transcribe",
      },
      input: "transcribe once",
    });
    const failed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-failed" },
      input: "fail once",
      hostStatus: "failed",
    });
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-completed" },
      input: "complete once",
    });

    assert.equal(refused.receipt.admitted, false);
    assert.equal(refused.receipt.status, "refused");
    assert.equal(failed.receipt.admitted, true);
    assert.equal(failed.receipt.status, "failed");
    assert.equal(completed.receipt.admitted, true);
    assert.equal(completed.receipt.status, "completed");

    const result = accounting.reconcileCausalHistory({
      warrants: [
        unspent.warrant,
        refused.warrant,
        failed.warrant,
        completed.warrant,
      ],
      attempts: [
        { warrant: refused.warrant, receipt: refused.receipt },
        { warrant: failed.warrant, receipt: failed.receipt },
        { warrant: completed.warrant, receipt: completed.receipt },
      ],
    });

    assert.equal(result.balanced, true);
    assert.equal(result.orphanEffects.length, 0);
    assert.deepEqual(
      result.entries.map((entry) => entry.disposition),
      ["unspent", "session-refused", "host-failed", "completed"],
    );
    for (const entry of result.entries) {
      assert.equal(entry.balance, "balanced");
      assert.deepEqual(entry.anomalyCodes, []);
      assert.equal(entry.warrant.authorityCut, declaration.version);
    }
  },
);

test(
  "pre-warrant refusal remains outside executable causal history and cannot reach Session or host",
  { skip: accounting === null },
  async () => {
    const host = recordingHost();
    const { runtime, session } = await makeRuntime(host.port);
    const result = await runtime.act(
      request({
        requestId: "request:causal-pre-warrant-refusal",
        targetRef: "artifact:not-in-this-trust",
      }),
      "must not execute",
    );

    assert.equal(result.admission.admitted, false);
    assert.equal(result.admission.code, "ACTION_WARRANT_TARGET_NOT_IN_CORPUS");
    assert.equal(result.admission.warrant, undefined);
    assert.equal(result.execution, undefined);
    assert.equal(host.calls.length, 0);
    assert.equal(session.recordedReceipts().length, 0);

    const history = accounting.reconcileCausalHistory({ warrants: [], attempts: [] });
    assert.equal(history.balanced, true);
    assert.deepEqual(history.entries, []);
    assert.deepEqual(history.orphanEffects, []);
  },
);

test(
  "a rejected second spend is distinguishable from a fabricated second consequence",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-replay" },
      input: "once only",
    });

    const second = await completed.runtime.execute(completed.warrant);
    assert.equal(second.executed, false);
    assert.equal(second.code, "ACTION_WARRANT_ALREADY_CONSUMED");
    assert.equal(completed.host.calls.length, 1);
    assert.equal(completed.session.recordedReceipts().length, 1);

    const balanced = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [{ warrant: completed.warrant, receipt: completed.receipt }],
    });
    assert.equal(balanced.balanced, true);
    assert.equal(balanced.entries[0].disposition, "completed");

    const fabricatedSecondReceipt = structuredClone(completed.receipt);
    const anomalous = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [
        { warrant: completed.warrant, receipt: completed.receipt },
        { warrant: completed.warrant, receipt: fabricatedSecondReceipt },
      ],
    });
    assert.equal(anomalous.balanced, false);
    assert.equal(anomalous.entries[0].balance, "anomaly");
    assert.ok(anomalous.entries[0].anomalyCodes.includes("DOUBLE_SPEND"));
  },
);

test(
  "orphan consequence evidence cannot be normalized into a copied warrant representation",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-orphan" },
      input: "orphan witness",
    });
    const copiedWarrant = { ...completed.warrant };

    const result = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [{ warrant: copiedWarrant, receipt: completed.receipt }],
    });

    assert.equal(result.balanced, false);
    assert.equal(result.orphanEffects.length, 1);
    assert.equal(result.orphanEffects[0], completed.receipt);
    assert.equal(result.entries[0].disposition, null);
    assert.ok(result.entries[0].anomalyCodes.includes("MISSING_DISPOSITION"));
  },
);

test(
  "substituted consequence fields are detected against the exact admitted warrant",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-substitution" },
      input: "bound input",
    });
    const substituted = structuredClone(completed.receipt);
    substituted.causalBinding.operationInput = "substituted input";

    const result = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [{ warrant: completed.warrant, receipt: substituted }],
    });

    assert.equal(result.balanced, false);
    assert.ok(
      result.entries[0].anomalyCodes.includes("SUBSTITUTED_CONSEQUENCE"),
    );
  },
);

test(
  "receipt bound to the wrong adopted authority cut is detected as broken lineage",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-lineage" },
      input: "lineage input",
    });
    const wrongCut = structuredClone(completed.receipt);
    wrongCut.causalBinding.authorityCut = "0.0-foreign";

    const result = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [{ warrant: completed.warrant, receipt: wrongCut }],
    });

    assert.equal(result.balanced, false);
    assert.ok(result.entries[0].anomalyCodes.includes("BROKEN_LINEAGE"));
  },
);

test(
  "spent authority without terminal attempt evidence remains an explicit missing disposition",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-missing-terminal" },
      input: "spent but hidden",
    });
    assert.equal(actionWarrant.inspectActionWarrantState(completed.warrant), "spent");

    const result = accounting.reconcileCausalHistory({
      warrants: [completed.warrant],
      attempts: [],
    });

    assert.equal(result.balanced, false);
    assert.equal(result.entries[0].disposition, null);
    assert.ok(result.entries[0].anomalyCodes.includes("MISSING_DISPOSITION"));
  },
);

test(
  "reconciliation is a pure view and does not mutate warrants, receipts, or input ordering",
  { skip: accounting === null },
  async () => {
    const completed = await issuedAttempt({
      requestOverrides: { requestId: "request:causal-purity" },
      input: "immutable evidence",
    });
    const warrants = [completed.warrant];
    const attempts = [{ warrant: completed.warrant, receipt: completed.receipt }];
    const warrantBefore = structuredClone(completed.warrant);
    const receiptBefore = structuredClone(completed.receipt);
    const warrantOrderBefore = [...warrants];
    const attemptOrderBefore = [...attempts];

    const result = accounting.reconcileCausalHistory({ warrants, attempts });

    assert.equal(result.balanced, true);
    assert.deepEqual(completed.warrant, warrantBefore);
    assert.deepEqual(completed.receipt, receiptBefore);
    assert.deepEqual(warrants, warrantOrderBefore);
    assert.deepEqual(attempts, attemptOrderBefore);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.entries), true);
    assert.equal(Object.isFrozen(result.entries[0]), true);
  },
);
