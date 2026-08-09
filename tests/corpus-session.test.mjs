import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CorpusSession } from "../.kernel-dist/runtime/session.js";

async function makeSession() {
  const session = new CorpusSession();
  await session.initialize();
  return session;
}

test("ring_6 opens through the session with exact-span and bounded-return truth preserved", async () => {
  const session = await makeSession();
  const opened = await session.open("ring_6");
  assert.equal(opened.particularId, "ring_6");
  assert.equal(opened.occurrences.length, 4);
  assert.ok(opened.occurrences.every((occurrence) => occurrence.exactSpanVerification === "verified"));
  assert.ok(opened.occurrences.some((occurrence) => occurrence.returnState === "bounded"));
  assert.ok(opened.occurrences.some((occurrence) => occurrence.returnState === "resolved"));
});

test("registry exposes exactly the declared synthetic owner and execution authority", async () => {
  const session = await makeSession();
  const capabilities = session.capabilities();
  assert.equal(capabilities.length, 1);
  assert.equal(capabilities[0].id, "synthetic.echo");
  assert.equal(capabilities[0].owner, "fixture.synthetic-runtime");
  assert.equal(capabilities[0].authority, "execution");
});

test("echo is admitted and produces a completed session receipt", async () => {
  const session = await makeSession();
  const result = session.run("synthetic.echo", "echo", "hello corpus");
  assert.equal(result.output, "echo:hello corpus");
  assert.equal(result.receipt.requestId, "session-request-0001");
  assert.equal(result.receipt.admitted, true);
  assert.equal(result.receipt.status, "completed");
  assert.equal(result.receipt.owner, "fixture.synthetic-runtime");
  assert.deepEqual(result.receipt.hostObservation, { platform: process.platform });
});

test("canonicalize is refused as declared non-authority", async () => {
  const session = await makeSession();
  const result = session.run("synthetic.echo", "canonicalize");
  assert.equal(result.receipt.admitted, false);
  assert.equal(result.receipt.status, "refused");
  assert.equal(result.receipt.refusalCode, "CAPABILITY_NON_AUTHORITY");
});

test("refusal records a new receipt without mutating source bytes or earlier receipts", async () => {
  const session = await makeSession();
  const sourceUrl = new URL("../corpus/sources/latent-design-grammar/curated_evidence.json", import.meta.url);
  const fixtureUrl = new URL("../fixtures/capabilities/synthetic.echo.json", import.meta.url);
  const beforeSource = await readFile(sourceUrl);
  const beforeFixture = await readFile(fixtureUrl);

  const admitted = session.run("synthetic.echo", "echo", "hello corpus");
  const admittedSnapshot = structuredClone(admitted.receipt);
  session.run("synthetic.echo", "canonicalize");

  const afterSource = await readFile(sourceUrl);
  const afterFixture = await readFile(fixtureUrl);
  assert.deepEqual(afterSource, beforeSource);
  assert.deepEqual(afterFixture, beforeFixture);
  assert.deepEqual(session.recordedReceipts()[0], admittedSnapshot);
  assert.equal(session.recordedReceipts().length, 2);
});

test("unknown capability fails closed", async () => {
  const session = await makeSession();
  const result = session.run("synthetic.missing", "echo", "hello");
  assert.equal(result.receipt.admitted, false);
  assert.equal(result.receipt.refusalCode, "CAPABILITY_NOT_FOUND");
});

test("unknown operation fails closed", async () => {
  const session = await makeSession();
  const result = session.run("synthetic.echo", "dance");
  assert.equal(result.receipt.admitted, false);
  assert.equal(result.receipt.refusalCode, "CAPABILITY_OPERATION_NOT_ALLOWED");
});

test("host observations never become semantic or canonical identity", async () => {
  const session = await makeSession();
  const { receipt } = session.run("synthetic.echo", "echo", "hello");
  assert.equal(Object.hasOwn(receipt, "semanticIdentity"), false);
  assert.equal(Object.hasOwn(receipt, "canonicalIdentity"), false);
  assert.equal(Object.hasOwn(receipt.hostObservation, "semanticIdentity"), false);
  assert.equal(Object.hasOwn(receipt.hostObservation, "canonicalIdentity"), false);
});
