import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CorpusSession } from "../.kernel-dist/runtime/session.js";

const admittedSourceUrl = new URL(
  "../corpus/sources/latent-design-grammar/curated_evidence.json",
  import.meta.url,
);
const capabilityFixtureUrl = new URL(
  "../fixtures/capabilities/synthetic.echo.json",
  import.meta.url,
);

async function newSession() {
  return CorpusSession.create();
}

test("ring_6 opens with exact admitted-byte verification and bounded upstream return", async () => {
  const session = await newSession();
  const opened = await session.open("ring_6");
  const inside = opened.occurrences.find(
    (occurrence) => occurrence.occurrenceId === "occ_ring6_inside",
  );

  assert.equal(opened.particularId, "ring_6");
  assert.equal(
    inside?.artifactIdentity,
    "sha256:5f9fc4e741aaacd0a2135616cd64da7435e6eff0735219ccb88afe06e2aae7db",
  );
  assert.equal(inside?.exactSpanVerification, "verified");
  assert.equal(inside?.return?.status, "bounded");
  assert.match(inside?.return?.unresolvedUpstream ?? "", /Pasted text \(5\)\.txt/);
});

test("registry exposes exactly one synthetic execution capability", async () => {
  const session = await newSession();
  assert.deepEqual(session.capabilities(), [
    {
      id: "synthetic.echo",
      owner: "fixture.synthetic-runtime",
      authority: "execution",
      transport: "local-process",
      allows: ["echo"],
      nonAuthority: ["canonicalize", "admit-source", "rewrite-artifact"],
    },
  ]);
});

test("echo is admitted and emits a completed launch receipt", async () => {
  const session = await newSession();
  await session.open("ring_6");
  const receipt = session.run("synthetic.echo", "echo", "hello corpus");

  assert.equal(receipt.requestId, "session-request:0001");
  assert.equal(receipt.capabilityId, "synthetic.echo");
  assert.equal(receipt.owner, "fixture.synthetic-runtime");
  assert.equal(receipt.operation, "echo");
  assert.equal(receipt.admitted, true);
  assert.equal(receipt.status, "completed");
  assert.equal(receipt.output, "hello corpus");
  assert.deepEqual(receipt.outputRefs, ["session-output:session-request:0001"]);
  assert.equal(receipt.evidenceRefs.includes("occ_ring6_inside"), true);
});

test("canonicalize is refused and prior state remains unchanged", async () => {
  const sourceBefore = await readFile(admittedSourceUrl);
  const capabilityBefore = await readFile(capabilityFixtureUrl);
  const session = await newSession();
  await session.open("ring_6");
  session.run("synthetic.echo", "echo", "hello corpus");
  const stateBefore = session.snapshotState();

  const refusal = session.run("synthetic.echo", "canonicalize", "hello corpus");

  assert.equal(refusal.admitted, false);
  assert.equal(refusal.status, "refused");
  assert.equal(refusal.refusalCode, "CAPABILITY_NON_AUTHORITY");

  const stateAfter = session.snapshotState();
  assert.deepEqual(stateAfter.openedParticular, stateBefore.openedParticular);
  assert.deepEqual(stateAfter.capabilities, stateBefore.capabilities);
  assert.deepEqual(
    stateAfter.receipts.slice(0, stateBefore.receipts.length),
    stateBefore.receipts,
  );
  assert.equal(stateAfter.receipts.length, stateBefore.receipts.length + 1);
  assert.deepEqual(await readFile(admittedSourceUrl), sourceBefore);
  assert.deepEqual(await readFile(capabilityFixtureUrl), capabilityBefore);
});

test("unknown capability fails closed", async () => {
  const session = await newSession();
  const refusal = session.run("missing.capability", "echo", "hello corpus");
  assert.equal(refusal.admitted, false);
  assert.equal(refusal.status, "refused");
  assert.equal(refusal.refusalCode, "CAPABILITY_NOT_FOUND");
  assert.equal(refusal.owner, null);
});

test("unknown operation fails closed", async () => {
  const session = await newSession();
  const refusal = session.run("synthetic.echo", "dance", "hello corpus");
  assert.equal(refusal.admitted, false);
  assert.equal(refusal.status, "refused");
  assert.equal(refusal.refusalCode, "CAPABILITY_OPERATION_NOT_ALLOWED");
});

test("host observations never become semantic or canonical identity", async () => {
  const session = await newSession();
  const receipt = session.run("synthetic.echo", "echo", "hello corpus");

  assert.equal(typeof receipt.hostObservation.platform, "string");
  assert.equal(Object.hasOwn(receipt, "canonicalIdentity"), false);
  assert.equal(Object.hasOwn(receipt, "semanticIdentity"), false);
  assert.match(receipt.requestId, /^session-request:/);
});

test("unknown particular fails explicitly", async () => {
  const session = await newSession();
  await assert.rejects(() => session.open("missing"), /Unknown particular/);
});
