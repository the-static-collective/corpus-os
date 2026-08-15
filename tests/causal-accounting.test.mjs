import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import * as actionWarrant from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { CorpusSession } from "../.kernel-dist/runtime/session.js";
import { WarrantedCorpusSession } from "../.kernel-dist/runtime/warranted-session.js";

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

test("issued Action Warrant spend state is inspectable without making copied representation authoritative", async () => {
  assert.equal(typeof actionWarrant.inspectActionWarrantState, "function");

  const host = recordingHost();
  const { runtime } = await makeRuntime(host.port);
  const admission = runtime.admit(request(), "causal input");

  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);
  assert.equal(actionWarrant.inspectActionWarrantState(admission.warrant), "unspent");
  assert.equal(
    actionWarrant.inspectActionWarrantState({ ...admission.warrant }),
    "invalid",
  );
});

test("Session terminal receipt preserves the exact warrant-bound causal fields and leaves authority spent", async () => {
  assert.equal(typeof actionWarrant.inspectActionWarrantState, "function");

  const host = recordingHost();
  const { runtime } = await makeRuntime(host.port);
  const admission = runtime.admit(request(), "causal input");
  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);

  const execution = await runtime.execute(admission.warrant);

  assert.equal(execution.executed, true);
  assert.equal(actionWarrant.inspectActionWarrantState(admission.warrant), "spent");
  assert.deepEqual(execution.launch.receipt.causalBinding, {
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
