import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF,
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

test("admits one verified public source ref under Corpus-owned local authority", () => {
  const before = structuredClone(encounter);
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate(request);

  assert.equal(result.status, "admitted");
  assert.equal(result.reasonCode, "CORPUS_ENCOUNTER_ADMITTED");
  assert.deepEqual(result.destinationAuthorityEvidenceRefs, [CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF]);
  assert.equal(result.destinationAuthorityEvidenceRefs.includes(encounter.body.sourceAuthorityRefs[0]), false);
  assert.deepEqual(encounter, before);
});

test("source-declared authority can never become Corpus destination authority", () => {
  const destination = createWorldEncounterDestination();
  const result = destination.evaluate({
    ...structuredClone(request),
    encounter: {
      ...structuredClone(encounter),
      body: {
        ...structuredClone(encounter.body),
        sourceAuthorityRefs: [CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF],
      },
    },
  });

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "CORPUS_SOURCE_AUTHORITY_NOT_LOCAL");
  assert.deepEqual(result.destinationAuthorityEvidenceRefs, [CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF]);
});

test("absence of Corpus-local authority refuses instead of borrowing source authority", () => {
  const destination = createWorldEncounterDestination({ localAuthorityRefs: [] });
  const result = destination.evaluate(request);

  assert.equal(result.status, "refused");
  assert.equal(result.reasonCode, "CORPUS_DESTINATION_AUTHORITY_REQUIRED");
  assert.deepEqual(result.destinationAuthorityEvidenceRefs, []);
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
});

test("unexpected destination execution failure is not constitutional refusal", () => {
  const result = runWorldEncounterDestination(request, () => {
    throw new Error("synthetic destination failure");
  });

  assert.equal(result.status, "failed");
  assert.equal(result.failureClass, "CORPUS_DESTINATION_RUNTIME_FAILURE");
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
  assert.deepEqual(result.destinationAuthorityEvidenceRefs, [CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF]);
});
