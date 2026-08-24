import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_ENCOUNTER_DESTINATION_FRAME,
  WORLD_ENCOUNTER_PROFILE,
  WORLD_ENCOUNTER_REQUEST_SCHEMA,
  evaluateWorldEncounterAdmission,
  refuseCallerAuthorityAttempt,
} from "../.kernel-dist/runtime/world-encounter-admission.js";

const ENVELOPE_REF = `enc-${"a".repeat(64)}`;
const FORBIDDEN_PHASE_FIELDS = [
  "warrant",
  "actorId",
  "capacity",
  "trustId",
  "trustHandle",
  "capabilityId",
  "capabilityOperation",
];

function request(overrides = {}) {
  return {
    schema: WORLD_ENCOUNTER_REQUEST_SCHEMA,
    envelopeRef: ENVELOPE_REF,
    destinationFrameRef: WORLD_ENCOUNTER_DESTINATION_FRAME,
    profile: WORLD_ENCOUNTER_PROFILE,
    destinationSubjectRef: "artifact:agreement-a",
    input: "hello from Full Bowl 002",
    ...overrides,
  };
}

function recordingHost({ status = "completed" } = {}) {
  return {
    host: "linux",
    async execute(execution) {
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
  };
}

function summarize(phases) {
  return phases.map(({ phase, disposition, reasonCode, authorityTransfer }) => ({
    phase,
    disposition,
    reasonCode,
    authorityTransfer,
  }));
}

function assertInert(phases) {
  assert.equal(Object.isFrozen(phases), true);
  for (const phase of phases) {
    assert.equal(Object.isFrozen(phase), true);
    assert.equal(Object.isFrozen(phase.evidenceRefs), true);
    assert.equal(phase.authorityTransfer, "none");
    for (const field of FORBIDDEN_PHASE_FIELDS) {
      assert.equal(field in phase, false, `${field} must not cross the witness boundary`);
    }
  }
}

test("completed encounter exposes four ordered inert phase dispositions", async () => {
  const result = await evaluateWorldEncounterAdmission(request(), {
    hostPort: recordingHost(),
  });

  assert.deepEqual(summarize(result.phases), [
    {
      phase: "destination-admission",
      disposition: "admitted",
      reasonCode: "CORPUS_DESTINATION_ADMITTED",
      authorityTransfer: "none",
    },
    {
      phase: "local-authority",
      disposition: "admitted",
      reasonCode: "ACTION_WARRANT_ADMITTED",
      authorityTransfer: "none",
    },
    {
      phase: "attempt",
      disposition: "admitted",
      reasonCode: "ACTION_WARRANT_EXECUTED",
      authorityTransfer: "none",
    },
    {
      phase: "outcome",
      disposition: "completed",
      reasonCode: "CORPUS_ENCOUNTER_COMPLETED",
      authorityTransfer: "none",
    },
  ]);
  assertInert(result.phases);
});

test("pre-warrant refusal exposes destination admission but no authority, attempt, or outcome phase", async () => {
  const result = await evaluateWorldEncounterAdmission(
    request({ destinationSubjectRef: "artifact:not-in-this-trust" }),
    { hostPort: recordingHost() },
  );

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "ACTION_WARRANT_TARGET_NOT_IN_CORPUS");
  assert.deepEqual(summarize(result.phases), [
    {
      phase: "destination-admission",
      disposition: "admitted",
      reasonCode: "CORPUS_DESTINATION_ADMITTED",
      authorityTransfer: "none",
    },
  ]);
  assertInert(result.phases);
});

test("host failure keeps admitted attempt distinct from failed terminal outcome", async () => {
  const result = await evaluateWorldEncounterAdmission(request(), {
    hostPort: recordingHost({ status: "failed" }),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "HOST_PROCESS_EXIT_NONZERO");
  assert.deepEqual(summarize(result.phases), [
    {
      phase: "destination-admission",
      disposition: "admitted",
      reasonCode: "CORPUS_DESTINATION_ADMITTED",
      authorityTransfer: "none",
    },
    {
      phase: "local-authority",
      disposition: "admitted",
      reasonCode: "ACTION_WARRANT_ADMITTED",
      authorityTransfer: "none",
    },
    {
      phase: "attempt",
      disposition: "admitted",
      reasonCode: "ACTION_WARRANT_EXECUTED",
      authorityTransfer: "none",
    },
    {
      phase: "outcome",
      disposition: "failed",
      reasonCode: "HOST_PROCESS_EXIT_NONZERO",
      authorityTransfer: "none",
    },
  ]);
  assertInert(result.phases);
});

test("caller-minted authority is refused before entering the owner-local phase chain", () => {
  const result = refuseCallerAuthorityAttempt(request());
  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "CALLER_AUTHORITY_NOT_ACCEPTED");
  assert.deepEqual(result.phases, []);
  assertInert(result.phases);
});
