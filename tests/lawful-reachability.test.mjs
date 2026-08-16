import assert from "node:assert/strict";
import test from "node:test";

let reachability = null;
try {
  reachability = await import("../.kernel-dist/runtime/world-cut.js");
} catch {}

const root = Object.freeze({
  trustId: "trust:casework.synthetic",
  authorityCut: "v0.1",
  constitutedRefs: Object.freeze([
    "artifact:agreement-a",
    "artifact:correspondence-a",
  ]),
});

const baseCause = Object.freeze({
  trustId: root.trustId,
  authorityCut: root.authorityCut,
  actorId: "person:administrator",
  capacity: "administrator",
  subjectRef: "artifact:agreement-a",
  capabilityId: "synthetic.echo",
  capabilityOperation: "echo",
  trustRequestId: "request:reachability-001",
});

function causalRecord({
  cause = baseCause,
  disposition = "completed",
  outputRefs = ["session-output:session-request-0001"],
  balance = "balanced",
  anomalyCodes = [],
} = {}) {
  return Object.freeze({
    cause: Object.freeze({ ...cause }),
    disposition,
    consequence:
      disposition === "completed"
        ? Object.freeze({ outputRefs: Object.freeze([...outputRefs]) })
        : undefined,
    balance,
    anomalyCodes: Object.freeze([...anomalyCodes]),
  });
}

function terminalRecord(disposition, requestId) {
  return causalRecord({
    disposition,
    cause: {
      ...baseCause,
      trustRequestId: requestId,
    },
    outputRefs: [],
  });
}

function worldTest(name, fn) {
  test(name, { skip: reachability === null }, fn);
}

test("world-cut module is executable", () => {
  assert.ok(reachability);
  assert.equal(typeof reachability.deriveWorldCut, "function");
  assert.equal(
    typeof reachability.reachabilityRecordsFromReconciliation,
    "function",
  );
});

worldTest(
  "balanced completion constitutes output and preserves terminal history",
  () => {
    const record = causalRecord();
    const world = reachability.deriveWorldCut({
      root,
      causalRecords: [record],
      observations: ["session-output:session-request-0001"],
    });

    assert.deepEqual(world.constitutedRefs, [
      "artifact:agreement-a",
      "artifact:correspondence-a",
      "session-output:session-request-0001",
    ]);
    assert.deepEqual(world.terminalHistory, [
      {
        cause: record.cause,
        disposition: "completed",
        outputRefs: ["session-output:session-request-0001"],
      },
    ]);
    assert.deepEqual(world.orphanObservations, []);
    assert.deepEqual(world.unresolved, []);
    assert.equal(world.legalValidity, "unclaimed");
  },
);

worldTest("host failure advances history without manufacturing output", () => {
  const world = reachability.deriveWorldCut({
    root,
    causalRecords: [terminalRecord("host-failed", "request:failed")],
    observations: [],
  });

  assert.deepEqual(world.terminalHistory.map((entry) => entry.disposition), [
    "host-failed",
  ]);
  assert.deepEqual(world.terminalHistory[0].outputRefs, []);
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});

worldTest(
  "Session refusal after spend advances a distinguishable history",
  () => {
    const world = reachability.deriveWorldCut({
      root,
      causalRecords: [terminalRecord("session-refused", "request:refused")],
      observations: [],
    });

    assert.deepEqual(world.terminalHistory.map((entry) => entry.disposition), [
      "session-refused",
    ]);
    assert.deepEqual(world.terminalHistory[0].outputRefs, []);
  },
);

worldTest("unspent evidence is not a consequential state transition", () => {
  const world = reachability.deriveWorldCut({
    root,
    causalRecords: [terminalRecord("unspent", "request:never-crossed")],
    observations: [],
  });

  assert.deepEqual(world.terminalHistory, []);
  assert.deepEqual(world.constitutedRefs, [...root.constitutedRefs].sort());
});

worldTest("failure and Session refusal do not collapse into one world cut", () => {
  const failed = reachability.deriveWorldCut({
    root,
    causalRecords: [terminalRecord("host-failed", "request:same-cause")],
    observations: [],
  });
  const refused = reachability.deriveWorldCut({
    root,
    causalRecords: [terminalRecord("session-refused", "request:same-cause")],
    observations: [],
  });

  assert.notDeepEqual(failed, refused);
});

worldTest(
  "observed ref with no causal ancestry remains an orphan observation",
  () => {
    const world = reachability.deriveWorldCut({
      root,
      causalRecords: [],
      observations: ["session-output:mystery-9999"],
    });

    assert.deepEqual(world.orphanObservations, [
      {
        ref: "session-output:mystery-9999",
        classification: "ORPHAN_OBSERVATION",
      },
    ]);
    assert.equal(
      world.constitutedRefs.includes("session-output:mystery-9999"),
      false,
    );
  },
);

for (const anomalyCode of [
  "ORPHAN_EFFECT",
  "DOUBLE_SPEND",
  "SUBSTITUTED_CONSEQUENCE",
  "BROKEN_LINEAGE",
  "MISSING_DISPOSITION",
]) {
  worldTest(`${anomalyCode} cannot constitute state`, () => {
    const anomalous = causalRecord({
      balance: "anomaly",
      anomalyCodes: [anomalyCode],
      outputRefs: [`session-output:${anomalyCode}`],
    });

    const world = reachability.deriveWorldCut({
      root,
      causalRecords: [anomalous],
      observations: [`session-output:${anomalyCode}`],
    });

    assert.equal(
      world.constitutedRefs.includes(`session-output:${anomalyCode}`),
      false,
    );
    assert.deepEqual(world.terminalHistory, []);
    assert.deepEqual(world.unresolved, [
      {
        classification: "UNRESOLVED",
        anomalyCode,
        trustRequestId: anomalous.cause.trustRequestId,
      },
    ]);
  });
}

worldTest("all anomaly codes remain visible instead of being collapsed", () => {
  const anomalous = causalRecord({
    balance: "anomaly",
    anomalyCodes: ["SUBSTITUTED_CONSEQUENCE", "DOUBLE_SPEND"],
    outputRefs: ["session-output:multi-anomaly"],
  });

  const world = reachability.deriveWorldCut({
    root,
    causalRecords: [anomalous],
    observations: ["session-output:multi-anomaly"],
  });

  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "DOUBLE_SPEND",
      trustRequestId: anomalous.cause.trustRequestId,
    },
    {
      classification: "UNRESOLVED",
      anomalyCode: "SUBSTITUTED_CONSEQUENCE",
      trustRequestId: anomalous.cause.trustRequestId,
    },
  ]);
});

worldTest("balanced record from another authority cut cannot bridge worlds", () => {
  const foreign = causalRecord({
    cause: {
      ...baseCause,
      authorityCut: "v0.2-foreign",
      trustRequestId: "request:foreign-cut",
    },
    outputRefs: ["session-output:foreign-cut"],
  });

  const world = reachability.deriveWorldCut({
    root,
    causalRecords: [foreign],
    observations: ["session-output:foreign-cut"],
  });

  assert.deepEqual(world.terminalHistory, []);
  assert.equal(world.constitutedRefs.includes("session-output:foreign-cut"), false);
  assert.deepEqual(world.unresolved, [
    {
      classification: "UNRESOLVED",
      anomalyCode: "BROKEN_LINEAGE",
      trustRequestId: "request:foreign-cut",
    },
  ]);
});

worldTest(
  "Causal Accounting reconciliation is narrowed without carrying warrant authority",
  () => {
    const warrant = Object.freeze({
      kind: "corpus-action-warrant-v0.1",
      trustId: root.trustId,
      authorityCut: root.authorityCut,
      actorId: "person:administrator",
      capacity: "administrator",
      purpose: "synthetic test",
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      capabilityOwner: "fixture.synthetic-runtime",
      trustRequestId: "request:adapter-completed",
      operationInput: "private bounded input",
      legalValidity: "unclaimed",
    });
    const receipt = Object.freeze({
      outputRefs: Object.freeze([
        "session-output:z-adapter",
        "session-output:a-adapter",
      ]),
    });
    const reconciliation = Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          warrant,
          disposition: "completed",
          receipts: Object.freeze([receipt]),
          balance: "balanced",
          anomalyCodes: Object.freeze([]),
        }),
      ]),
      orphanEffects: Object.freeze([]),
      balanced: true,
    });

    const records =
      reachability.reachabilityRecordsFromReconciliation(reconciliation);

    assert.deepEqual(records, [
      {
        cause: {
          trustId: root.trustId,
          authorityCut: root.authorityCut,
          actorId: "person:administrator",
          capacity: "administrator",
          subjectRef: "artifact:agreement-a",
          capabilityId: "synthetic.echo",
          capabilityOperation: "echo",
          trustRequestId: "request:adapter-completed",
        },
        disposition: "completed",
        consequence: {
          outputRefs: [
            "session-output:a-adapter",
            "session-output:z-adapter",
          ],
        },
        balance: "balanced",
        anomalyCodes: [],
      },
    ]);
    assert.equal("warrant" in records[0], false);
    assert.equal("receipts" in records[0], false);
    assert.equal("operationInput" in records[0].cause, false);
    assert.equal("capabilityOwner" in records[0].cause, false);
    assert.equal(Object.isFrozen(records), true);
    assert.equal(Object.isFrozen(records[0]), true);
    assert.equal(Object.isFrozen(records[0].cause), true);
    assert.equal(Object.isFrozen(records[0].anomalyCodes), true);
  },
);

worldTest(
  "adapter preserves every upstream Causal Accounting anomaly code",
  () => {
    const warrant = Object.freeze({
      trustId: root.trustId,
      authorityCut: root.authorityCut,
      actorId: "person:administrator",
      capacity: "administrator",
      subjectRef: "artifact:agreement-a",
      capabilityId: "synthetic.echo",
      capabilityOperation: "echo",
      trustRequestId: "request:adapter-anomaly",
    });
    const reconciliation = Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          warrant,
          disposition: null,
          receipts: Object.freeze([]),
          balance: "anomaly",
          anomalyCodes: Object.freeze([
            "MISSING_DISPOSITION",
            "BROKEN_LINEAGE",
          ]),
        }),
      ]),
      orphanEffects: Object.freeze([]),
      balanced: false,
    });

    const records =
      reachability.reachabilityRecordsFromReconciliation(reconciliation);

    assert.deepEqual(records[0].anomalyCodes, [
      "BROKEN_LINEAGE",
      "MISSING_DISPOSITION",
    ]);
    assert.equal(records[0].disposition, null);
  },
);

worldTest(
  "same admitted evidence deterministically re-derives the same world cut",
  () => {
    const records = [
      causalRecord(),
      terminalRecord("host-failed", "request:failed-reentry"),
    ];
    const observations = [
      "session-output:mystery-reentry",
      "session-output:session-request-0001",
    ];

    const first = reachability.deriveWorldCut({
      root,
      causalRecords: records,
      observations,
    });
    const second = reachability.deriveWorldCut({
      root,
      causalRecords: records,
      observations,
    });

    assert.deepEqual(second, first);
    assert.notEqual(second, first);
  },
);

worldTest("input insertion order does not change the world projection", () => {
  const records = [
    causalRecord(),
    terminalRecord("host-failed", "request:order-failed"),
    causalRecord({
      cause: {
        ...baseCause,
        actorId: "person:zeta",
        trustRequestId: "request:tie",
      },
      outputRefs: ["session-output:z-tie"],
    }),
    causalRecord({
      cause: {
        ...baseCause,
        actorId: "person:alpha",
        trustRequestId: "request:tie",
      },
      outputRefs: ["session-output:a-tie"],
    }),
  ];
  const observations = [
    "session-output:z-orphan",
    "session-output:a-orphan",
    "session-output:session-request-0001",
  ];

  const forward = reachability.deriveWorldCut({
    root,
    causalRecords: records,
    observations,
  });
  const reversed = reachability.deriveWorldCut({
    root,
    causalRecords: [...records].reverse(),
    observations: [...observations].reverse(),
  });

  assert.deepEqual(reversed, forward);
});

worldTest("derivation mutates no supplied evidence", () => {
  const mutableRoot = {
    trustId: root.trustId,
    authorityCut: root.authorityCut,
    constitutedRefs: ["artifact:agreement-a"],
  };
  const mutableRecord = structuredClone(causalRecord());
  const observations = ["session-output:session-request-0001"];
  const before = structuredClone({ mutableRoot, mutableRecord, observations });

  reachability.deriveWorldCut({
    root: mutableRoot,
    causalRecords: [mutableRecord],
    observations,
  });

  assert.deepEqual({ mutableRoot, mutableRecord, observations }, before);
});

worldTest(
  "WorldCut is frozen projection data with no authority or execution surface",
  () => {
    const world = reachability.deriveWorldCut({
      root,
      causalRecords: [],
      observations: [],
    });

    for (const forbidden of [
      "run",
      "execute",
      "act",
      "admit",
      "issueWarrant",
      "consumeWarrant",
      "repair",
      "promote",
    ]) {
      assert.equal(forbidden in world, false);
    }

    assert.equal(Object.isFrozen(world), true);
    assert.equal(Object.isFrozen(world.root), true);
    assert.equal(Object.isFrozen(world.constitutedRefs), true);
    assert.equal(Object.isFrozen(world.terminalHistory), true);
    assert.equal(Object.isFrozen(world.unresolved), true);
    assert.equal(Object.isFrozen(world.orphanObservations), true);
  },
);
