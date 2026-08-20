import assert from "node:assert/strict";
import test from "node:test";

const world = await import("../.kernel-dist/runtime/world-cut.js");

let continuity = null;
try {
  continuity = await import("../.kernel-dist/runtime/continuity-attestation.js");
} catch {}

function cause(authorityCut, requestId) {
  return Object.freeze({
    trustId: "trust:casework.synthetic",
    authorityCut,
    actorId: "person:administrator",
    capacity: "administrator",
    subjectRef: "artifact:agreement-a",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    trustRequestId: requestId,
  });
}

function causalRecord({ authorityCut, requestId, disposition, outputRefs = [] }) {
  return Object.freeze({
    cause: cause(authorityCut, requestId),
    disposition,
    ...(disposition === "completed"
      ? { consequence: Object.freeze({ outputRefs: Object.freeze([...outputRefs]) }) }
      : {}),
    balance: "balanced",
    anomalyCodes: Object.freeze([]),
  });
}

function deriveCuts() {
  const priorCut = world.deriveWorldCut({
    root: Object.freeze({
      trustId: "trust:casework.synthetic",
      authorityCut: "v0.1",
      constitutedRefs: Object.freeze([
        "artifact:agreement-a",
        "artifact:correspondence-a",
        "artifact:legacy-note",
        "artifact:superseded-appendix",
      ]),
    }),
    causalRecords: [
      causalRecord({
        authorityCut: "v0.1",
        requestId: "request:prior-refused",
        disposition: "session-refused",
      }),
    ],
    observations: ["artifact:orphan-shared"],
  });

  const currentCut = world.deriveWorldCut({
    root: Object.freeze({
      trustId: "trust:casework.synthetic",
      authorityCut: "v0.2",
      constitutedRefs: Object.freeze([
        "artifact:agreement-a",
        "artifact:correspondence-a",
      ]),
    }),
    causalRecords: [
      causalRecord({
        authorityCut: "v0.2",
        requestId: "request:current-amendment",
        disposition: "completed",
        outputRefs: ["artifact:amendment-b"],
      }),
      causalRecord({
        authorityCut: "v0.2",
        requestId: "request:current-host-failed",
        disposition: "host-failed",
      }),
    ],
    observations: ["artifact:amendment-b", "artifact:orphan-shared"],
  });

  return { priorCut, currentCut };
}

const transitionEvidence = Object.freeze([
  Object.freeze({
    kind: "transformed",
    priorRef: "artifact:legacy-note",
    currentRef: "artifact:amendment-b",
    evidenceRef: "transition:legacy-to-amendment",
  }),
  Object.freeze({
    kind: "lost",
    priorRef: "artifact:superseded-appendix",
    evidenceRef: "transition:appendix-retired",
  }),
]);

function input(overrides = {}) {
  const { priorCut, currentCut } = deriveCuts();
  return {
    priorCutRef: "world-cut:prior-v01",
    currentCutRef: "world-cut:current-v02",
    priorCut,
    currentCut,
    transitionEvidence,
    authorityContinuity: "separately-evidenced",
    authorityEvidenceRefs: ["authority-evidence:adoption-v02"],
    ...overrides,
  };
}

function continuityTest(name, fn) {
  test(name, { skip: continuity === null }, fn);
}

test("continuity-attestation module is executable", () => {
  assert.ok(continuity);
  assert.equal(typeof continuity.deriveCorpusContinuityAttestation, "function");
});

continuityTest("real WorldCut succession keeps continuity classes mechanically distinct", () => {
  const attestation = continuity.deriveCorpusContinuityAttestation(input());

  assert.deepEqual(attestation.preservedRefs, [
    "artifact:agreement-a",
    "artifact:correspondence-a",
  ]);
  assert.deepEqual(attestation.transformed, [
    {
      priorRef: "artifact:legacy-note",
      currentRef: "artifact:amendment-b",
      evidenceRef: "transition:legacy-to-amendment",
    },
  ]);
  assert.deepEqual(attestation.lost, [
    {
      priorRef: "artifact:superseded-appendix",
      evidenceRef: "transition:appendix-retired",
    },
  ]);
  assert.deepEqual(attestation.unresolvedRefs, []);
  assert.equal(attestation.legalValidity, "unclaimed");
  assert.equal(attestation.purpose, "corpus-worldcut-succession");
});

continuityTest("terminal refusal and host failure remain visible rather than becoming successful continuity", () => {
  const attestation = continuity.deriveCorpusContinuityAttestation(input());

  assert.deepEqual(
    attestation.priorTerminalHistory.map((entry) => entry.disposition),
    ["session-refused"],
  );
  assert.deepEqual(
    attestation.currentTerminalHistory.map((entry) => entry.disposition),
    ["completed", "host-failed"],
  );
  assert.deepEqual(
    attestation.currentTerminalHistory.find((entry) => entry.disposition === "host-failed").outputRefs,
    [],
  );
});

continuityTest("matching orphan observations never become preserved refs", () => {
  const attestation = continuity.deriveCorpusContinuityAttestation(input());

  assert.equal(attestation.preservedRefs.includes("artifact:orphan-shared"), false);
  assert.deepEqual(attestation.priorOrphanObservations, [
    { ref: "artifact:orphan-shared", classification: "ORPHAN_OBSERVATION" },
  ]);
  assert.deepEqual(attestation.currentOrphanObservations, [
    { ref: "artifact:orphan-shared", classification: "ORPHAN_OBSERVATION" },
  ]);
});

continuityTest("authority-cut change stays explicit and separately evidenced remains inert", () => {
  const attestation = continuity.deriveCorpusContinuityAttestation(input());

  assert.deepEqual(attestation.authorityCutChange, {
    prior: "v0.1",
    current: "v0.2",
    changed: true,
  });
  assert.equal(attestation.authorityContinuity, "separately-evidenced");
  assert.deepEqual(attestation.authorityEvidenceRefs, ["authority-evidence:adoption-v02"]);

  for (const forbidden of [
    "warrant",
    "issueWarrant",
    "consumeWarrant",
    "consumeIssuedActionWarrant",
    "launchCapability",
    "execute",
    "admit",
    "hostPort",
  ]) {
    assert.equal(forbidden in attestation, false);
  }
});

continuityTest("unexplained constituted difference remains unresolved rather than becoming lost", () => {
  const reducedEvidence = transitionEvidence.filter(
    (entry) => entry.priorRef !== "artifact:superseded-appendix",
  );
  const attestation = continuity.deriveCorpusContinuityAttestation(
    input({ transitionEvidence: reducedEvidence }),
  );

  assert.deepEqual(attestation.lost, []);
  assert.deepEqual(attestation.unresolvedRefs, ["artifact:superseded-appendix"]);
});

continuityTest("same admitted evidence re-derives structurally identical frozen attestation", () => {
  const first = continuity.deriveCorpusContinuityAttestation(input());
  const second = continuity.deriveCorpusContinuityAttestation(input());

  assert.deepEqual(second, first);
  assert.notEqual(second, first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.preservedRefs), true);
  assert.equal(Object.isFrozen(first.transformed), true);
  assert.equal(Object.isFrozen(first.lost), true);
  assert.equal(Object.isFrozen(first.unresolvedRefs), true);
  assert.equal(Object.isFrozen(first.authorityCutChange), true);
  assert.equal(Object.isFrozen(first.whyCurrent), true);
});

continuityTest("JSON, spread, and structuredClone remain inert data", () => {
  const attestation = continuity.deriveCorpusContinuityAttestation(input());
  const json = JSON.parse(JSON.stringify(attestation));
  const spread = { ...attestation };
  const cloned = structuredClone(attestation);

  assert.deepEqual(json, spread);
  assert.deepEqual(cloned, spread);
  const queue = [cloned];
  while (queue.length > 0) {
    const value = queue.pop();
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) queue.push(child);
    } else {
      assert.notEqual(typeof value, "function");
    }
  }
});

continuityTest("invalid or ambiguous transition evidence fails closed", () => {
  assert.throws(() =>
    continuity.deriveCorpusContinuityAttestation(
      input({
        transitionEvidence: [
          ...transitionEvidence,
          {
            kind: "lost",
            priorRef: "artifact:legacy-note",
            evidenceRef: "transition:duplicate-prior",
          },
        ],
      }),
    ),
  );

  assert.throws(() =>
    continuity.deriveCorpusContinuityAttestation(
      input({
        transitionEvidence: [
          {
            kind: "transformed",
            priorRef: "artifact:legacy-note",
            currentRef: "artifact:agreement-a",
            evidenceRef: "transition:not-current-only",
          },
        ],
      }),
    ),
  );
});

continuityTest("separately-evidenced authority requires separate evidence refs", () => {
  assert.throws(() =>
    continuity.deriveCorpusContinuityAttestation(
      input({ authorityEvidenceRefs: [] }),
    ),
  );
});

continuityTest("different trusts cannot be presented as one Corpus succession", () => {
  const base = input();
  const foreignCurrent = {
    ...base.currentCut,
    root: { ...base.currentCut.root, trustId: "trust:other" },
  };

  assert.throws(() =>
    continuity.deriveCorpusContinuityAttestation(
      input({ currentCut: foreignCurrent }),
    ),
  );
});

continuityTest("accessor-backed transition evidence fails closed without executing the accessor", () => {
  let accessorExecuted = false;
  const hostile = [];
  Object.defineProperty(hostile, "0", {
    enumerable: true,
    configurable: true,
    get() {
      accessorExecuted = true;
      return transitionEvidence[0];
    },
  });
  hostile.length = 1;

  assert.throws(() =>
    continuity.deriveCorpusContinuityAttestation(
      input({ transitionEvidence: hostile }),
    ),
  );
  assert.equal(accessorExecuted, false);
});
