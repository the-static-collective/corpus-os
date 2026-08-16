import assert from "node:assert/strict";
import test from "node:test";

import { deriveWorldCut } from "../.kernel-dist/runtime/world-cut.js";

const root = Object.freeze({
  trustId: "trust:casework.synthetic",
  authorityCut: "v0.1",
  constitutedRefs: Object.freeze(["artifact:agreement-a"]),
});

function record(overrides = {}) {
  return Object.freeze({
    cause: Object.freeze({
      trustId: root.trustId,
      authorityCut: root.authorityCut,
      actorId: "person:administrator",
      capacity: "administrator",
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      trustRequestId: "request:boundary",
      ...(overrides.cause ?? {}),
    }),
    disposition: overrides.disposition ?? "completed",
    consequence: Object.freeze({
      outputRefs: Object.freeze([
        ...(overrides.outputRefs ?? ["session-output:boundary"]),
      ]),
    }),
    balance: overrides.balance ?? "balanced",
    anomalyCodes: Object.freeze([...(overrides.anomalyCodes ?? [])]),
  });
}

test("contradictory balanced record with anomaly evidence fails closed", () => {
  const anomalous = record({
    anomalyCodes: ["DOUBLE_SPEND"],
    outputRefs: ["session-output:must-not-constitute"],
  });

  const world = deriveWorldCut({
    root,
    causalRecords: [anomalous],
    observations: ["session-output:must-not-constitute"],
  });

  assert.equal(
    world.constitutedRefs.includes("session-output:must-not-constitute"),
    false,
  );
  assert.deepEqual(world.terminalHistory, []);
  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "DOUBLE_SPEND",
      trustRequestId: "request:boundary",
    },
  ]);
  assert.deepEqual(world.orphanObservations, [
    {
      ref: "session-output:must-not-constitute",
      classification: "ORPHAN_OBSERVATION",
    },
  ]);
});

test("unattributed balanced record cannot become a reachability edge", () => {
  const unattributed = record({
    cause: {
      actorId: null,
      capacity: null,
      trustRequestId: "request:unattributed-balanced",
    },
    outputRefs: ["session-output:unattributed-balanced"],
  });

  const world = deriveWorldCut({
    root,
    causalRecords: [unattributed],
    observations: ["session-output:unattributed-balanced"],
  });

  assert.equal(
    world.constitutedRefs.includes("session-output:unattributed-balanced"),
    false,
  );
  assert.deepEqual(world.terminalHistory, []);
  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      trustRequestId: "request:unattributed-balanced",
    },
  ]);
});
