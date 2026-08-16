import assert from "node:assert/strict";
import test from "node:test";

import * as launch from "../.kernel-dist/runtime/launch.js";

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
const hasPolicy = typeof launch.evaluateCapabilityPolicy === "function";

function policyTest(name, fn) {
  test(name, { skip: !hasPolicy }, fn);
}

test("pure capability policy evaluator is executable", () => {
  assert.equal(typeof launch.evaluateCapabilityPolicy, "function");
});

policyTest("pure capability policy admits the same executable capability", () => {
  const result = launch.evaluateCapabilityPolicy(registry, baseWarrant);
  assert.equal(result.admitted, true);
  assert.equal(result.capability, capability);
});

policyTest("pure capability policy preserves refusal codes", () => {
  assert.equal(
    launch.evaluateCapabilityPolicy(new Map(), baseWarrant).code,
    "CAPABILITY_NOT_FOUND",
  );
  assert.equal(
    launch.evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOwner: "wrong.owner" }),
    ).code,
    "CAPABILITY_OWNER_MISMATCH",
  );
  assert.equal(
    launch.evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOperation: "inspect" }),
    ).code,
    "CAPABILITY_NON_AUTHORITY",
  );
  assert.equal(
    launch.evaluateCapabilityPolicy(
      registry,
      Object.freeze({ ...baseWarrant, capabilityOperation: "delete" }),
    ).code,
    "CAPABILITY_OPERATION_NOT_ALLOWED",
  );
});
