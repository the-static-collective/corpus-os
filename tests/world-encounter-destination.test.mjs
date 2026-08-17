import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  CORPUS_WORLD_ENCOUNTER_POLICY_REF,
  createWorldEncounterDestination,
  runWorldEncounterDestination,
} from "../.kernel-dist/kernel/world-encounter-destination.js";

const encounter = {
  ref: `enc-${"a".repeat(64)}`,
  body: {
    protocolVersion: "p0.exchange/0.1",
    offered: {
      objectRef: "github:the-static-collective/project0@fixture:src/nav-crossing/index.ts",
      mediaType: "text/typescript",
      sourceReceiptRefs: [],
      disclosureClass: "public",
    },
    sourceAuthorityRefs: [],
    sourceProvenanceRefs: ["github:the-static-collective/project0@fixture"],
    sourceEpistemicKind: "source",
    sourceVerificationState: "verified",
  },
};

const request = {
  schema: "corpus.world-encounter-destination/v0.1",
  capability: "corpus.receive-public-source-ref/v0.1",
  encounter,
};

test("admits one verified public source ref under Corpus-owned non-authoritative policy", () => {
  const before = structuredClone(encounter);
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate(request);

  assert.equal(result.status, "admitted");
  assert.equal(result.reasonCode, "CORPUS_ENCOUNTER_ADMITTED");
  assert.equal(result.authority, "none");
  assert.deepEqual(result.destinationPolicyEvidenceRefs, [CORPUS_WORLD_ENCOUNTER_POLICY_REF]);
  assert.deepEqual(encounter, before);
});

test("source-declared authority is ignored rather than becoming destination authority", () => {
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate({
    ...structuredClone(request),
    encounter: {
      ...structuredClone(encounter),
      body: {
        ...structuredClone(encounter.body),
        sourceAuthorityRefs: ["source:claims-this-power"],
      },
    },
  });

  assert.equal(result.status, "admitted");
  assert.equal(result.authority, "none");
  assert.equal(JSON.stringify(result).includes("source:claims-this-power"), false);
});

test("absence of Corpus-local policy refuses without manufacturing authority", () => {
  const destination = createWorldEncounterDestination({ policyEnabled: false });
  const result = destination.evaluate(request);

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "CORPUS_DESTINATION_POLICY_REQUIRED");
  assert.equal(result.authority, "none");
  assert.deepEqual(result.destinationPolicyEvidenceRefs, []);
});

test("unsupported Project0 encounter protocol fails compatibility locally", () => {
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate({
    ...structuredClone(request),
    encounter: {
      ...structuredClone(encounter),
      body: {
        ...structuredClone(encounter.body),
        protocolVersion: "p0.exchange/9.9",
      },
    },
  });

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "CORPUS_PROTOCOL_UNSUPPORTED");
  assert.equal(result.authority, "none");
});

test("unresolved source verification stays indeterminate", () => {
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate({
    ...structuredClone(request),
    encounter: {
      ...structuredClone(encounter),
      body: {
        ...structuredClone(encounter.body),
        sourceVerificationState: "unknown",
      },
    },
  });

  assert.equal(result.status, "indeterminate");
  assert.equal(result.reasonCode, "CORPUS_SOURCE_VERIFICATION_UNRESOLVED");
  assert.equal(result.authority, "none");
});

test("unexpected destination execution failure is not constitutional refusal", () => {
  const result = runWorldEncounterDestination(request, () => {
    throw new Error("synthetic destination failure");
  });

  assert.equal(result.status, "failed");
  assert.equal(result.failureClass, "CORPUS_DESTINATION_RUNTIME_FAILURE");
  assert.equal(result.authority, "none");
});

test("stdio host returns the Corpus-owned disposition without accepting caller authority", () => {
  const child = spawnSync(process.execPath, [".kernel-dist/scripts/world-encounter-destination.js"], {
    input: JSON.stringify(request),
    encoding: "utf8",
  });

  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.schema, "corpus.world-encounter-disposition/v0.1");
  assert.equal(result.status, "admitted");
  assert.equal(result.authority, "none");
  assert.deepEqual(result.destinationPolicyEvidenceRefs, [CORPUS_WORLD_ENCOUNTER_POLICY_REF]);
});
