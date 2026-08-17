import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

import {
  WORLD_ENCOUNTER_DESTINATION_FRAME,
  WORLD_ENCOUNTER_PROFILE,
  WORLD_ENCOUNTER_REQUEST_SCHEMA,
  evaluateWorldEncounterAdmission,
} from "../.kernel-dist/runtime/world-encounter-admission.js";

const ENVELOPE_REF = `enc-${"a".repeat(64)}`;
const STDIO_RESPONSE_SCHEMA = "corpus-os/world-encounter-stdio-response/v0.1";

function request(overrides = {}) {
  return {
    schema: WORLD_ENCOUNTER_REQUEST_SCHEMA,
    envelopeRef: ENVELOPE_REF,
    destinationFrameRef: WORLD_ENCOUNTER_DESTINATION_FRAME,
    profile: WORLD_ENCOUNTER_PROFILE,
    destinationSubjectRef: "artifact:agreement-a",
    input: "hello from Boot the House",
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

async function runAdapter(input) {
  const child = spawn(process.execPath, [".kernel-dist/scripts/world-encounter-stdio.js"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.end(input);

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  const code = await new Promise((resolve) => child.on("close", resolve));
  return { code, stdout, stderr };
}

test("verified local subject crosses only through Corpus-owned adopted warrant and Session", async () => {
  const host = recordingHost();
  const result = await evaluateWorldEncounterAdmission(request(), { hostPort: host.port });

  assert.equal(result.status, "admitted");
  assert.equal(result.reasonCode, "CORPUS_ENCOUNTER_ADMITTED");
  assert.equal(result.destinationFrameRef, WORLD_ENCOUNTER_DESTINATION_FRAME);
  assert.equal(result.envelopeRef, ENVELOPE_REF);
  assert.equal(result.authorityTransfer, "none");
  assert.equal(result.callerAuthenticated, false);
  assert.equal(result.legalValidity, "unclaimed");
  assert.equal(result.receiptRequestId, "session-request-0001");
  assert.deepEqual(result.outputRefs, ["session-output:session-request-0001"]);
  assert.ok(result.evidenceRefs.includes(ENVELOPE_REF));
  assert.ok(result.evidenceRefs.includes("fixtures/capabilities/synthetic.echo.json"));
  assert.equal(host.calls.length, 1);
  assert.equal(host.calls[0].capabilityId, "synthetic.echo");
  assert.equal(host.calls[0].operation, "echo");
  assert.equal(host.calls[0].input, "hello from Boot the House");
});

test("foreign destination subject is refused by existing Corpus warrant admission before Session", async () => {
  const host = recordingHost();
  const result = await evaluateWorldEncounterAdmission(
    request({ destinationSubjectRef: "artifact:not-in-this-trust" }),
    { hostPort: host.port },
  );

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "ACTION_WARRANT_TARGET_NOT_IN_CORPUS");
  assert.equal(result.receiptRequestId, undefined);
  assert.equal(result.authorityTransfer, "none");
  assert.equal(host.calls.length, 0);
});

test("missing destination subject remains indeterminate without minting or spending authority", async () => {
  const host = recordingHost();
  const candidate = request();
  delete candidate.destinationSubjectRef;

  const result = await evaluateWorldEncounterAdmission(candidate, { hostPort: host.port });

  assert.equal(result.status, "indeterminate");
  assert.equal(result.reasonCode, "DESTINATION_SUBJECT_UNRESOLVED");
  assert.equal(result.receiptRequestId, undefined);
  assert.equal(result.authorityTransfer, "none");
  assert.equal(host.calls.length, 0);
});

test("host failure remains a failed admitted attempt rather than constitutional refusal", async () => {
  const host = recordingHost({ status: "failed" });
  const result = await evaluateWorldEncounterAdmission(request(), { hostPort: host.port });

  assert.equal(result.status, "failed");
  assert.equal(result.reasonCode, "HOST_PROCESS_EXIT_NONZERO");
  assert.equal(result.receiptRequestId, "session-request-0001");
  assert.equal(result.authorityTransfer, "none");
  assert.equal(host.calls.length, 1);
});

test("stdio adapter performs one real default-host admitted encounter", async () => {
  const result = await runAdapter(`${JSON.stringify(request())}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout);
  assert.equal(response.schema, STDIO_RESPONSE_SCHEMA);
  assert.equal(response.ok, true);
  assert.equal(response.result.status, "admitted");
  assert.equal(response.result.reasonCode, "CORPUS_ENCOUNTER_ADMITTED");
  assert.equal(response.result.callerAuthenticated, false);
  assert.equal(response.result.authorityTransfer, "none");
});

test("stdio adapter reports malformed JSON structurally", async () => {
  const result = await runAdapter("{not-json\n");
  assert.equal(result.code, 1);
  assert.deepEqual(JSON.parse(result.stdout), {
    schema: STDIO_RESPONSE_SCHEMA,
    ok: false,
    error: { code: "ADAPTER_MALFORMED_JSON" },
  });
});

test("caller-minted authority fields are constitutionally refused, never interpreted as authority", async () => {
  const forged = {
    ...request(),
    actorId: "person:administrator",
    capacity: "administrator",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    warrant: { kind: "corpus-action-warrant-v0.1" },
  };
  const result = await runAdapter(`${JSON.stringify(forged)}\n`);
  assert.equal(result.code, 0, result.stderr);
  const response = JSON.parse(result.stdout);
  assert.equal(response.ok, true);
  assert.equal(response.result.status, "refused");
  assert.equal(response.result.reasonCode, "CALLER_AUTHORITY_NOT_ACCEPTED");
  assert.equal(response.result.callerAuthenticated, false);
  assert.equal(response.result.authorityTransfer, "none");
  assert.equal(response.result.receiptRequestId, undefined);
});
