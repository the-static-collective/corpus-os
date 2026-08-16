import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWorldCut,
  reachabilityRecordsFromReconciliation,
} from "../.kernel-dist/runtime/world-cut.js";

const root = Object.freeze({
  trustId: "trust:casework.synthetic",
  authorityCut: "v0.1",
  constitutedRefs: Object.freeze(["artifact:agreement-a"]),
});

test("top-level orphan effects remain explicit without inventing warrant attribution", () => {
  const orphanEffect = Object.freeze({
    outputRefs: Object.freeze(["session-output:unattributed-effect"]),
    causalBinding: Object.freeze({
      trustId: root.trustId,
      authorityCut: root.authorityCut,
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      capabilityOwner: "fixture.synthetic-runtime",
      trustRequestId: "request:orphan-effect",
      operationInput: "must not cross reachability boundary",
    }),
  });
  const reconciliation = Object.freeze({
    entries: Object.freeze([]),
    orphanEffects: Object.freeze([orphanEffect]),
    balanced: false,
  });

  const records = reachabilityRecordsFromReconciliation(reconciliation);

  assert.deepEqual(records, [
    {
      cause: {
        trustId: root.trustId,
        authorityCut: root.authorityCut,
        actorId: null,
        capacity: null,
        subjectRef: "artifact:agreement-a",
        capabilityId: "synthetic.echo",
        capabilityOperation: "echo",
        trustRequestId: "request:orphan-effect",
      },
      disposition: null,
      balance: "anomaly",
      anomalyCodes: ["ORPHAN_EFFECT"],
    },
  ]);
  assert.equal("operationInput" in records[0].cause, false);
  assert.equal("capabilityOwner" in records[0].cause, false);

  const world = deriveWorldCut({
    root,
    causalRecords: records,
    observations: ["session-output:unattributed-effect"],
  });

  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "ORPHAN_EFFECT",
      trustRequestId: "request:orphan-effect",
    },
  ]);
  assert.deepEqual(world.orphanObservations, [
    {
      ref: "session-output:unattributed-effect",
      classification: "ORPHAN_OBSERVATION",
    },
  ]);
  assert.equal(
    world.constitutedRefs.includes("session-output:unattributed-effect"),
    false,
  );
});
