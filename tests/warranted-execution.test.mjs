import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CorpusSession } from "../.kernel-dist/runtime/session.js";
import { WarrantedCorpusSession } from "../.kernel-dist/runtime/warranted-session.js";

const declaration = JSON.parse(
  await readFile(new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url), "utf8"),
);

function request(overrides = {}) {
  return {
    requestId: "request:warrant-001",
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

function recordingHost() {
  const calls = [];
  return {
    calls,
    port: {
      host: "linux",
      async execute(execution) {
        calls.push(structuredClone(execution));
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

async function makeRuntime({ trust = declaration, hostPort } = {}) {
  const session = new CorpusSession(hostPort);
  await session.initialize();
  return {
    session,
    runtime: new WarrantedCorpusSession(trust, session),
  };
}

test("administrator trust admission issues a bound warrant and crosses Session + Linux host", async () => {
  const { runtime } = await makeRuntime();
  const result = await runtime.act(request(), "hello warranted corpus");

  assert.equal(result.admission.admitted, true);
  assert.equal(result.admission.code, "ACTION_WARRANT_ADMITTED");
  assert.equal(result.admission.trustReceipt.admitted, true);

  const warrant = result.admission.warrant;
  assert.equal(warrant.kind, "corpus-action-warrant-v0.1");
  assert.equal(warrant.trustId, declaration.id);
  assert.equal(warrant.authorityCut, declaration.version);
  assert.equal(warrant.actorId, "person:administrator");
  assert.equal(warrant.capacity, "administrator");
  assert.equal(warrant.purpose, declaration.purpose);
  assert.equal(warrant.subjectRef, "artifact:agreement-a");
  assert.equal(warrant.capabilityId, "synthetic.echo");
  assert.equal(warrant.capabilityOperation, "echo");
  assert.equal(warrant.capabilityOwner, "fixture.synthetic-runtime");
  assert.equal(warrant.trustRequestId, "request:warrant-001");
  assert.equal(warrant.operationInput, "hello warranted corpus");
  assert.equal(warrant.legalValidity, "unclaimed");
  assert.equal(Object.isFrozen(warrant), true);

  assert.equal(result.execution.executed, true);
  assert.equal(result.execution.code, "ACTION_WARRANT_EXECUTED");
  assert.equal(result.execution.launch.output, "echo:hello warranted corpus");
  assert.equal(result.execution.launch.receipt.admitted, true);
  assert.equal(result.execution.launch.receipt.status, "completed");
});

test("operation input is bound at admission and execution accepts no replacement payload", async () => {
  const host = recordingHost();
  const { runtime } = await makeRuntime({ hostPort: host.port });
  const admission = runtime.admit(request(), "bound-at-admission");

  assert.equal(admission.admitted, true);
  const execution = await runtime.execute(admission.warrant);

  assert.equal(execution.executed, true);
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].input, "bound-at-admission");
});

test("Trust-admitted non-capability actions cannot mint an Action Warrant", async () => {
  const host = recordingHost();
  const { runtime, session } = await makeRuntime({ hostPort: host.port });
  const admission = runtime.admit(
    request({
      requestId: "request:inspect-not-warrant",
      operation: "inspect",
      targetScope: "corpus",
      capabilityId: undefined,
      capabilityOperation: undefined,
    }),
    "not executable",
  );

  assert.equal(admission.trustReceipt.admitted, true);
  assert.equal(admission.admitted, false);
  assert.equal(admission.code, "ACTION_WARRANT_OPERATION_REQUIRED");
  assert.equal(admission.warrant, undefined);
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("foreign corpus subject is refused before Session or host execution", async () => {
  const host = recordingHost();
  const { runtime, session } = await makeRuntime({ hostPort: host.port });
  const result = await runtime.act(
    request({ targetRef: "artifact:not-in-this-trust" }),
    "must not execute",
  );

  assert.equal(result.admission.admitted, false);
  assert.equal(result.admission.code, "ACTION_WARRANT_TARGET_NOT_IN_CORPUS");
  assert.equal(result.admission.warrant, undefined);
  assert.equal(result.execution, undefined);
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("invoke-capability requires an exact corpus subject before a warrant can issue", async () => {
  const host = recordingHost();
  const { runtime } = await makeRuntime({ hostPort: host.port });
  const result = await runtime.act(request({ targetRef: undefined }), "must not execute");

  assert.equal(result.admission.admitted, false);
  assert.equal(result.admission.code, "ACTION_WARRANT_TARGET_REQUIRED");
  assert.equal(host.calls.length, 0);
});

test("participant without invoke power is refused by Trust before Session or host", async () => {
  const host = recordingHost();
  const { runtime, session } = await makeRuntime({ hostPort: host.port });
  const result = await runtime.act(
    request({
      actorId: "person:beneficiary",
      capacity: "beneficiary",
    }),
    "must not execute",
  );

  assert.equal(result.admission.admitted, false);
  assert.equal(result.admission.code, "TRUST_POWER_NOT_GRANTED");
  assert.equal(result.admission.trustReceipt.code, "TRUST_POWER_NOT_GRANTED");
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("Trust capability non-authority and unknown operations refuse before Session", async () => {
  for (const [capabilityOperation, expectedCode] of [
    ["canonicalize", "TRUST_CAPABILITY_NON_AUTHORITY"],
    ["dance", "TRUST_CAPABILITY_OPERATION_NOT_ALLOWED"],
  ]) {
    const host = recordingHost();
    const { runtime, session } = await makeRuntime({ hostPort: host.port });
    const result = await runtime.act(
      request({ capabilityOperation, requestId: `request:${capabilityOperation}` }),
      "must not execute",
    );

    assert.equal(result.admission.admitted, false);
    assert.equal(result.admission.code, expectedCode);
    assert.equal(host.calls.length, 0);
    assert.equal(session.recordedReceipts().length, 0);
  }
});

test("Trust and Session capability owners must agree before execution", async () => {
  const mismatchedTrust = structuredClone(declaration);
  mismatchedTrust.capabilities.find((capability) => capability.id === "synthetic.echo").owner =
    "fixture.mismatched-runtime";

  const host = recordingHost();
  const { runtime, session } = await makeRuntime({ trust: mismatchedTrust, hostPort: host.port });
  const admission = runtime.admit(request(), "must not execute");
  assert.equal(admission.admitted, true);
  assert.equal(admission.warrant.capabilityOwner, "fixture.mismatched-runtime");

  const execution = await runtime.execute(admission.warrant);
  assert.equal(execution.executed, false);
  assert.equal(execution.code, "ACTION_WARRANT_CAPABILITY_OWNER_MISMATCH");
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("plain objects, spread copies, JSON copies, and structured clones cannot manufacture authority", async () => {
  const host = recordingHost();
  const { runtime } = await makeRuntime({ hostPort: host.port });
  const admission = runtime.admit(request(), "real issued input");
  assert.equal(admission.admitted, true);

  const copies = [
    { ...admission.warrant },
    JSON.parse(JSON.stringify(admission.warrant)),
    structuredClone(admission.warrant),
  ];

  for (const copy of copies) {
    const execution = await runtime.execute(copy);
    assert.equal(execution.executed, false);
    assert.equal(execution.code, "ACTION_WARRANT_INVALID");
  }

  assert.equal(host.calls.length, 0);
});

test("a warrant is one-shot and replay cannot produce a second host consequence", async () => {
  const host = recordingHost();
  const { runtime, session } = await makeRuntime({ hostPort: host.port });
  const admission = runtime.admit(request(), "once only");

  const first = await runtime.execute(admission.warrant);
  const second = await runtime.execute(admission.warrant);

  assert.equal(first.executed, true);
  assert.equal(second.executed, false);
  assert.equal(second.code, "ACTION_WARRANT_ALREADY_CONSUMED");
  assert.equal(host.calls.length, 1);
  assert.equal(session.recordedReceipts().length, 1);
});

test("Session refusal spends the warrant and cannot be retried under the same authority", async () => {
  const trustAllowsMoreThanSession = structuredClone(declaration);
  trustAllowsMoreThanSession.capabilities
    .find((capability) => capability.id === "synthetic.echo")
    .allows.push("session-refuses");

  const host = recordingHost();
  const { runtime, session } = await makeRuntime({
    trust: trustAllowsMoreThanSession,
    hostPort: host.port,
  });
  const admission = runtime.admit(
    request({
      requestId: "request:session-refusal",
      capabilityOperation: "session-refuses",
    }),
    "once even when refused",
  );
  assert.equal(admission.admitted, true);

  const first = await runtime.execute(admission.warrant);
  const second = await runtime.execute(admission.warrant);

  assert.equal(first.executed, false);
  assert.equal(first.code, "ACTION_WARRANT_SESSION_REFUSED");
  assert.equal(first.launch.receipt.admitted, false);
  assert.equal(first.launch.receipt.refusalCode, "CAPABILITY_OPERATION_NOT_ALLOWED");
  assert.equal(second.executed, false);
  assert.equal(second.code, "ACTION_WARRANT_ALREADY_CONSUMED");
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 1);
});

test("warrant authority cut is bound to the declaration id and version used for execution", async () => {
  const host = recordingHost();
  const { session, runtime } = await makeRuntime({ hostPort: host.port });
  const admission = runtime.admit(request(), "old authority cut");
  assert.equal(admission.admitted, true);

  const changedDeclaration = { ...declaration, version: "0.2" };
  const changedRuntime = new WarrantedCorpusSession(changedDeclaration, session);
  const execution = await changedRuntime.execute(admission.warrant);

  assert.equal(execution.executed, false);
  assert.equal(execution.code, "ACTION_WARRANT_AUTHORITY_CUT_MISMATCH");
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});
