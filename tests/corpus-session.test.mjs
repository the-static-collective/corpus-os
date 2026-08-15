import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { LinuxLocalProcessHostPort } from "../.kernel-dist/host/linux/local-process-adapter.js";
import { admitActionWarrant } from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { evaluateCapabilityAdmission } from "../.kernel-dist/runtime/launch.js";
import { CorpusSession } from "../.kernel-dist/runtime/session.js";

const declaration = JSON.parse(
  await readFile(
    new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url),
    "utf8",
  ),
);

function request(overrides = {}) {
  return {
    requestId: "request:session-test",
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

async function makeSession(hostPort) {
  const session = new CorpusSession(hostPort);
  await session.initialize();
  return session;
}

async function issuedWarrant(overrides = {}, input = "hello corpus") {
  const adoption = await loadAdoptedDeclaration();
  assert.equal(adoption.adopted, true);
  assert.ok(adoption.handle);
  const admission = admitActionWarrant(adoption.handle, request(overrides), input);
  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);
  return admission.warrant;
}

function registryFrom(session) {
  return new Map(session.capabilities().map((capability) => [capability.id, capability]));
}

test("ring_6 opens through the session with exact-span and bounded-return truth preserved", async () => {
  const session = await makeSession();
  const opened = await session.open("ring_6");
  assert.equal(opened.particularId, "ring_6");
  assert.equal(opened.occurrences.length, 4);
  assert.ok(
    opened.occurrences.every(
      (occurrence) => occurrence.exactSpanVerification === "verified",
    ),
  );
  assert.ok(
    opened.occurrences.some((occurrence) => occurrence.returnState === "bounded"),
  );
  assert.ok(
    opened.occurrences.some((occurrence) => occurrence.returnState === "resolved"),
  );
});

test("registry exposes exactly the declared synthetic owner and execution authority", async () => {
  const session = await makeSession();
  const capabilities = session.capabilities();
  assert.equal(capabilities.length, 1);
  assert.equal(capabilities[0].id, "synthetic.echo");
  assert.equal(capabilities[0].owner, "fixture.synthetic-runtime");
  assert.equal(capabilities[0].authority, "execution");
});

test("genuine adopted warrant is admitted and produces a completed session receipt", async () => {
  const session = await makeSession();
  const warrant = await issuedWarrant({}, "hello corpus");
  const result = await session.run(warrant);

  assert.equal(result.accepted, true);
  assert.equal(result.code, "SESSION_WARRANT_ACCEPTED");
  assert.equal(result.output, "echo:hello corpus");
  assert.equal(result.receipt.requestId, "session-request-0001");
  assert.equal(result.receipt.admitted, true);
  assert.equal(result.receipt.status, "completed");
  assert.equal(result.receipt.owner, "fixture.synthetic-runtime");
  assert.equal(result.receipt.hostObservation.platform, process.platform);
  assert.equal(result.receipt.hostObservation.exitCode, 0);
  assert.equal(result.receipt.hostObservation.signal, null);
});

test("warranted execution is delegated to an injected host port as structured data", async () => {
  const executions = [];
  const hostPort = {
    host: "linux",
    async execute(execution) {
      executions.push(structuredClone(execution));
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
  };

  const session = await makeSession(hostPort);
  const warrant = await issuedWarrant({}, "hello corpus");
  const result = await session.run(warrant);

  assert.equal(result.accepted, true);
  assert.equal(result.output, "host:hello corpus");
  assert.deepEqual(executions, [
    {
      requestId: "session-request-0001",
      capabilityId: "synthetic.echo",
      operation: "echo",
      input: "hello corpus",
    },
  ]);
});

test("an admitted host failure becomes a failed receipt rather than false success", async () => {
  const hostPort = {
    host: "linux",
    async execute() {
      return {
        status: "failed",
        failureCode: "HOST_PROCESS_EXIT_NONZERO",
        hostObservation: {
          platform: process.platform,
          exitCode: 23,
          signal: null,
        },
      };
    },
  };

  const session = await makeSession(hostPort);
  const warrant = await issuedWarrant();
  const result = await session.run(warrant);

  assert.equal(result.accepted, true);
  assert.equal(result.output, undefined);
  assert.equal(result.receipt.admitted, true);
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.failureCode, "HOST_PROCESS_EXIT_NONZERO");
  assert.equal(result.receipt.hostObservation.exitCode, 23);
});

test("fixed non-zero host specimen reports observed exit instead of start failure", async () => {
  const hostPort = new LinuxLocalProcessHostPort();
  const result = await hostPort.execute({
    requestId: "host-failure-0001",
    capabilityId: "synthetic.fail",
    operation: "fail",
    input: "data only",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.failureCode, "HOST_PROCESS_EXIT_NONZERO");
  assert.equal(result.hostObservation.exitCode, 23);
  assert.equal(result.hostObservation.signal, null);
});

test("lower-level capability policy remains testable without host execution", async () => {
  const session = await makeSession();
  const registry = registryFrom(session);
  const warrant = await issuedWarrant();

  const nonAuthority = evaluateCapabilityAdmission(
    registry,
    "policy-0001",
    { ...warrant, capabilityOperation: "canonicalize" },
  );
  assert.equal(nonAuthority.refusal.refusalCode, "CAPABILITY_NON_AUTHORITY");

  const unknownOperation = evaluateCapabilityAdmission(
    registry,
    "policy-0002",
    { ...warrant, capabilityOperation: "dance" },
  );
  assert.equal(
    unknownOperation.refusal.refusalCode,
    "CAPABILITY_OPERATION_NOT_ALLOWED",
  );

  const unknownCapability = evaluateCapabilityAdmission(
    registry,
    "policy-0003",
    { ...warrant, capabilityId: "synthetic.missing" },
  );
  assert.equal(unknownCapability.refusal.refusalCode, "CAPABILITY_NOT_FOUND");

  const ownerMismatch = evaluateCapabilityAdmission(
    registry,
    "policy-0004",
    { ...warrant, capabilityOwner: "fixture.wrong-owner" },
  );
  assert.equal(ownerMismatch.refusal.refusalCode, "CAPABILITY_OWNER_MISMATCH");
});

test("Session refusal records a terminal receipt without mutating admitted source bytes", async () => {
  const session = await makeSession();
  const sourceUrl = new URL(
    "../corpus/sources/latent-design-grammar/curated_evidence.json",
    import.meta.url,
  );
  const fixtureUrl = new URL(
    "../fixtures/capabilities/synthetic.echo.json",
    import.meta.url,
  );
  const beforeSource = await readFile(sourceUrl);
  const beforeFixture = await readFile(fixtureUrl);

  const warrant = await issuedWarrant(
    {
      requestId: "request:session-transcribe-refusal",
      capabilityId: "synthetic.transcribe",
      capabilityOperation: "transcribe",
    },
    "must refuse at Session",
  );
  const result = await session.run(warrant);

  const afterSource = await readFile(sourceUrl);
  const afterFixture = await readFile(fixtureUrl);
  assert.equal(result.accepted, true);
  assert.equal(result.receipt.admitted, false);
  assert.equal(result.receipt.status, "refused");
  assert.equal(result.receipt.refusalCode, "CAPABILITY_NOT_FOUND");
  assert.deepEqual(afterSource, beforeSource);
  assert.deepEqual(afterFixture, beforeFixture);
  assert.equal(session.recordedReceipts().length, 1);
});

test("host observations never become semantic or canonical identity", async () => {
  const session = await makeSession();
  const warrant = await issuedWarrant();
  const result = await session.run(warrant);
  assert.equal(result.accepted, true);
  const { receipt } = result;
  assert.equal(Object.hasOwn(receipt, "semanticIdentity"), false);
  assert.equal(Object.hasOwn(receipt, "canonicalIdentity"), false);
  assert.equal(Object.hasOwn(receipt.hostObservation, "semanticIdentity"), false);
  assert.equal(Object.hasOwn(receipt.hostObservation, "canonicalIdentity"), false);
});
