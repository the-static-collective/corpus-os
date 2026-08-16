import assert from "node:assert/strict";
import test from "node:test";

import {
  admitActionWarrant,
  consumeIssuedActionWarrant,
  inspectActionWarrantState,
} from "../.kernel-dist/runtime/action-warrant.js";
import { loadAdoptedDeclaration } from "../.kernel-dist/runtime/adopted-declaration.js";
import { loadCapabilityRegistry } from "../.kernel-dist/runtime/capability-registry.js";

let latent = null;
try {
  latent = await import("../.kernel-dist/runtime/latent-reachability.js");
} catch {}

const adoption = await loadAdoptedDeclaration();
assert.equal(adoption.adopted, true);
assert.ok(adoption.handle);

const registry = await loadCapabilityRegistry();

function request(id) {
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
  };
}

function issue(id) {
  const admission = admitActionWarrant(
    adoption.handle,
    request(id),
    "latent bounded input",
  );
  assert.equal(admission.admitted, true);
  assert.ok(admission.warrant);
  return admission.warrant;
}

function worldFor(warrant, overrides = {}) {
  return Object.freeze({
    root: Object.freeze({
      trustId: warrant.trustId,
      authorityCut: warrant.authorityCut,
    }),
    constitutedRefs: Object.freeze([warrant.subjectRef]),
    terminalHistory: Object.freeze([]),
    unresolved: Object.freeze([]),
    orphanObservations: Object.freeze([]),
    legalValidity: "unclaimed",
    ...overrides,
  });
}

function latentTest(name, fn) {
  test(name, { skip: latent === null }, fn);
}

test("latent reachability module is executable", () => {
  assert.ok(latent);
  assert.equal(typeof latent.inspectLatentReachability, "function");
});

latentTest(
  "genuine unspent warrant is prospectively reachable without being consumed",
  () => {
    const warrant = issue("request:latent-happy");
    const world = worldFor(warrant);

    const first = latent.inspectLatentReachability(world, registry, warrant);
    const second = latent.inspectLatentReachability(world, registry, warrant);

    assert.deepEqual(first, {
      reachable: true,
      code: "ATTEMPT_REACHABLE",
      trustRequestId: "request:latent-happy",
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      outcome: "unknown-until-attempted",
      legalValidity: "unclaimed",
    });
    assert.deepEqual(second, first);
    assert.equal(inspectActionWarrantState(warrant), "unspent");
    assert.equal(Object.isFrozen(first), true);

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
      assert.equal(forbidden in first, false);
    }
  },
);

latentTest("copied warrant representation is not latent authority", () => {
  const warrant = issue("request:latent-copy");
  const world = worldFor(warrant);

  for (const copy of [
    { ...warrant },
    JSON.parse(JSON.stringify(warrant)),
    structuredClone(warrant),
  ]) {
    const result = latent.inspectLatentReachability(world, registry, copy);
    assert.deepEqual(result, {
      reachable: false,
      code: "LATENT_WARRANT_INVALID",
      legalValidity: "unclaimed",
    });
    assert.equal(Object.isFrozen(result), true);
  }

  assert.equal(inspectActionWarrantState(warrant), "unspent");
});

latentTest("spent warrant is not prospectively reachable", () => {
  const warrant = issue("request:latent-spent");
  assert.equal(consumeIssuedActionWarrant(warrant).status, "consumed");

  assert.deepEqual(
    latent.inspectLatentReachability(worldFor(warrant), registry, warrant),
    {
      reachable: false,
      code: "LATENT_WARRANT_SPENT",
      trustRequestId: "request:latent-spent",
      legalValidity: "unclaimed",
    },
  );
});

latentTest("authority-cut lineage must match the constituted root", () => {
  const warrant = issue("request:latent-lineage");
  const world = worldFor(warrant, {
    root: Object.freeze({
      trustId: warrant.trustId,
      authorityCut: "foreign-cut",
    }),
  });

  assert.equal(
    latent.inspectLatentReachability(world, registry, warrant).code,
    "LATENT_BROKEN_LINEAGE",
  );
  assert.equal(inspectActionWarrantState(warrant), "unspent");
});

latentTest("subject must already belong to constituted reality", () => {
  const warrant = issue("request:latent-subject");
  const world = worldFor(warrant, {
    constitutedRefs: Object.freeze([]),
  });

  assert.equal(
    latent.inspectLatentReachability(world, registry, warrant).code,
    "LATENT_SUBJECT_NOT_CONSTITUTED",
  );
  assert.equal(inspectActionWarrantState(warrant), "unspent");
});

latentTest("shared capability policy refusals remain distinguishable", () => {
  const cases = [
    ["CAPABILITY_NOT_FOUND", () => new Map()],
    [
      "CAPABILITY_OWNER_MISMATCH",
      (capability) =>
        new Map([
          [
            capability.id,
            Object.freeze({ ...capability, owner: "foreign.owner" }),
          ],
        ]),
    ],
    [
      "CAPABILITY_NON_AUTHORITY",
      (capability) =>
        new Map([
          [
            capability.id,
            Object.freeze({
              ...capability,
              allows: Object.freeze(["echo"]),
              nonAuthority: Object.freeze(["echo"]),
            }),
          ],
        ]),
    ],
    [
      "CAPABILITY_OPERATION_NOT_ALLOWED",
      (capability) =>
        new Map([
          [
            capability.id,
            Object.freeze({
              ...capability,
              allows: Object.freeze([]),
              nonAuthority: Object.freeze([]),
            }),
          ],
        ]),
    ],
  ];

  const baseCapability = registry.get("synthetic.echo");
  assert.ok(baseCapability);

  for (const [expectedCode, makeRegistry] of cases) {
    const warrant = issue(`request:latent-policy-${expectedCode}`);
    const testRegistry = makeRegistry(baseCapability);
    const result = latent.inspectLatentReachability(
      worldFor(warrant),
      testRegistry,
      warrant,
    );

    assert.equal(result.reachable, false);
    assert.equal(result.code, expectedCode);
    assert.equal(result.trustRequestId, warrant.trustRequestId);
    assert.equal(inspectActionWarrantState(warrant), "unspent");
  }
});
