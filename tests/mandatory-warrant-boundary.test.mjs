import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { admitActionWarrant } from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { CorpusSession } from "../.kernel-dist/runtime/session.js";

const declaration = JSON.parse(
  await readFile(
    new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url),
    "utf8",
  ),
);

function request(overrides = {}) {
  return {
    requestId: "request:session-boundary",
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

function recordingHost({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    port: {
      host: "linux",
      async execute(execution) {
        calls.push(structuredClone(execution));
        if (fail) {
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

async function adoptedHandle() {
  const adoption = await loadAdoptedDeclaration();
  assert.equal(adoption.adopted, true);
  assert.ok(adoption.handle);
  return adoption.handle;
}

async function issuedWarrant(overrides = {}, input = "bounded input") {
  const handle = await adoptedHandle();
  const admission = admitActionWarrant(handle, request(overrides), input);
  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);
  return admission.warrant;
}

async function makeSession(hostPort) {
  const session = new CorpusSession(hostPort);
  await session.initialize();
  return session;
}

test("legacy raw Session invocation cannot reach the host consequence boundary", async () => {
  const host = recordingHost();
  const session = await makeSession(host.port);

  const result = await session.run("synthetic.echo", "echo", "legacy bypass");

  assert.equal(result.accepted, false);
  assert.equal(result.code, "SESSION_WARRANT_INVALID");
  assert.equal(result.receipt, undefined);
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("a genuine issued warrant is consumed by Session and binds the host request", async () => {
  const host = recordingHost();
  const session = await makeSession(host.port);
  const warrant = await issuedWarrant({}, "session-bound input");

  const result = await session.run(warrant);

  assert.equal(result.accepted, true);
  assert.equal(result.code, "SESSION_WARRANT_ACCEPTED");
  assert.equal(result.output, "host:session-bound input");
  assert.equal(result.receipt.admitted, true);
  assert.equal(result.receipt.status, "completed");
  assert.deepEqual(host.calls, [
    {
      requestId: "session-request-0001",
      capabilityId: "synthetic.echo",
      operation: "echo",
      input: "session-bound input",
    },
  ]);
  assert.equal(session.recordedReceipts().length, 1);
});

test("copied warrant representation cannot reach Session or host", async () => {
  const host = recordingHost();
  const session = await makeSession(host.port);
  const warrant = await issuedWarrant();
  const copies = [
    { ...warrant },
    JSON.parse(JSON.stringify(warrant)),
    structuredClone(warrant),
  ];

  for (const copy of copies) {
    const result = await session.run(copy);
    assert.equal(result.accepted, false);
    assert.equal(result.code, "SESSION_WARRANT_INVALID");
    assert.equal(result.receipt, undefined);
  }

  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 0);
});

test("one issued warrant can produce at most one Session attempt and host consequence", async () => {
  const host = recordingHost();
  const session = await makeSession(host.port);
  const warrant = await issuedWarrant({}, "once only");

  const first = await session.run(warrant);
  const second = await session.run(warrant);

  assert.equal(first.accepted, true);
  assert.equal(first.receipt.status, "completed");
  assert.equal(second.accepted, false);
  assert.equal(second.code, "SESSION_WARRANT_ALREADY_CONSUMED");
  assert.equal(second.receipt, undefined);
  assert.equal(host.calls.length, 1);
  assert.equal(session.recordedReceipts().length, 1);
});

test("Session capability refusal spends the warrant before lower-boundary admission", async () => {
  const host = recordingHost();
  const session = await makeSession(host.port);
  const warrant = await issuedWarrant(
    {
      requestId: "request:transcribe-not-in-session",
      capabilityId: "synthetic.transcribe",
      capabilityOperation: "transcribe",
    },
    "transcribe once",
  );

  const first = await session.run(warrant);
  const second = await session.run(warrant);

  assert.equal(first.accepted, true);
  assert.equal(first.code, "SESSION_WARRANT_ACCEPTED");
  assert.equal(first.receipt.admitted, false);
  assert.equal(first.receipt.status, "refused");
  assert.equal(first.receipt.refusalCode, "CAPABILITY_NOT_FOUND");
  assert.equal(second.accepted, false);
  assert.equal(second.code, "SESSION_WARRANT_ALREADY_CONSUMED");
  assert.equal(host.calls.length, 0);
  assert.equal(session.recordedReceipts().length, 1);
});

test("host failure terminally spends the same warrant", async () => {
  const host = recordingHost({ fail: true });
  const session = await makeSession(host.port);
  const warrant = await issuedWarrant({}, "fail once");

  const first = await session.run(warrant);
  const second = await session.run(warrant);

  assert.equal(first.accepted, true);
  assert.equal(first.receipt.admitted, true);
  assert.equal(first.receipt.status, "failed");
  assert.equal(first.receipt.failureCode, "HOST_PROCESS_EXIT_NONZERO");
  assert.equal(second.accepted, false);
  assert.equal(second.code, "SESSION_WARRANT_ALREADY_CONSUMED");
  assert.equal(host.calls.length, 1);
  assert.equal(session.recordedReceipts().length, 1);
});
