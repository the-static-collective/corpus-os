import assert from "node:assert/strict";
import test from "node:test";

import {
  createIngestedArtifact,
  createIntakeSelector,
  detectMediaType,
  exportSessionBundle,
  isAllowedFile,
  returnToBytes,
  sha256Bytes,
  verifyIntakeSelector,
} from "../.kernel-dist/lib/intake.js";

// Node 22+ provides `crypto.subtle` globally; no need to assign it.

const sampleText = `# Test Document

The first paragraph contains ring_6 as a keyword.
The second paragraph mentions the daughter as architect.

Final line for good measure.`;

const sampleBytes = new TextEncoder().encode(sampleText);
const selectedText = "ring_6 as a keyword";

test("detectMediaType accepts .txt, .md, .json and rejects others", () => {
  assert.equal(detectMediaType("test.txt"), "text/plain");
  assert.equal(detectMediaType("test.md"), "text/markdown");
  assert.equal(detectMediaType("test.json"), "application/json");
  assert.equal(detectMediaType("test.yaml"), null);
  assert.equal(detectMediaType("test"), null);
});

test("isAllowedFile gates on extension", () => {
  assert.ok(isAllowedFile("doc.txt"));
  assert.ok(isAllowedFile("doc.md"));
  assert.ok(isAllowedFile("doc.json"));
  assert.ok(!isAllowedFile("doc.yaml"));
  assert.ok(!isAllowedFile("doc"));
});

test("sha256Bytes matches the kernel sha256 hash law", async () => {
  assert.equal(
    await sha256Bytes(new TextEncoder().encode("accepted")),
    "sha256:070c160a6299c5438070b1aa737b14fc2992ed49579c14264884886a5876f971",
  );
  assert.equal(
    await sha256Bytes(new TextEncoder().encode("rejected")),
    "sha256:20cd938a2ea64f612b3523bc9219130c6fc66cd09b394ea38437488c0b8898b2",
  );
});

test("createIngestedArtifact computes identity over exact bytes", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  assert.equal(artifact.identity, await sha256Bytes(sampleBytes));
  assert.equal(artifact.byteLength, sampleBytes.byteLength);
  assert.equal(artifact.mediaType, "text/markdown");
  assert.equal(artifact.originalName, "test.md");
});

test("createIntakeSelector resolves exact UTF-8 byte bounds", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);

  const expectedStart = new TextEncoder().encode(
    sampleText.slice(0, sampleText.indexOf(selectedText)),
  ).length;
  const expectedEnd = expectedStart + new TextEncoder().encode(selectedText).length;

  assert.equal(selector.byteStart, expectedStart);
  assert.equal(selector.byteEnd, expectedEnd);
  assert.equal(
    selector.selectedTextHash,
    await sha256Bytes(new TextEncoder().encode(selectedText)),
  );
  assert.equal(selector.artifactIdentity, artifact.identity);
});

test("verifyIntakeSelector succeeds on correct artifact and selector", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const result = await verifyIntakeSelector(sampleBytes, selector);
  assert.equal(result.code, "verified");
  assert.ok(result.valid);
  assert.ok(result.extractedBytes);
});

test("verifyIntakeSelector fails on artifact substitution", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const tampered = new Uint8Array([...sampleBytes, ...new TextEncoder().encode("extra")]);
  const result = await verifyIntakeSelector(tampered, selector);
  assert.equal(result.code, "artifact_identity_mismatch");
  assert.ok(!result.valid);
});

test("verifyIntakeSelector fails on corrupted selector bounds", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const result = await verifyIntakeSelector(sampleBytes, {
    ...selector,
    byteStart: selector.byteStart + 1,
  });
  assert.equal(result.code, "selected_text_hash_mismatch");
  assert.ok(!result.valid);
});

test("verifyIntakeSelector fails on out-of-bounds selector", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const result = await verifyIntakeSelector(sampleBytes, {
    ...selector,
    byteEnd: sampleBytes.byteLength + 100,
  });
  assert.equal(result.code, "selector_out_of_bounds");
  assert.ok(!result.valid);
});

test("returnToBytes extracts the exact selected bytes", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const extracted = returnToBytes(sampleBytes, selector);
  assert.equal(new TextDecoder().decode(extracted), selectedText);
});

test("exportSessionBundle preserves canonicalIdentity: null and unsealed status", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const selector = await createIntakeSelector(artifact, sampleText, selectedText);
  const bundle = exportSessionBundle(artifact, [selector], sampleBytes);

  assert.equal(bundle.schema, "corpus-os.local-intake-session.v0");
  assert.equal(bundle.status, "portable_draft_unsealed");
  assert.equal(bundle.canonicalIdentity, null);
  assert.equal(bundle.canonicalAddressing.status, "blocked");
  assert.equal(bundle.canonicalAddressing.dependency, "Project 0 issue #5");
  assert.equal(bundle.selectors.length, 1);
  assert.equal(bundle.artifact.identity, artifact.identity);
  assert.ok(bundle.sourceBytes.length > 0);
});

test("createIntakeSelector rejects text not present in source", async () => {
  const artifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  await assert.rejects(
    () => createIntakeSelector(artifact, sampleText, "nonexistent text"),
    /not present/,
  );
});

test("intake identity matches kernel sha256 for the same bytes", async () => {
  const { createArtifactRef, sha256 } = await import("../.kernel-dist/kernel/index.js");
  const kernelArtifact = createArtifactRef(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  const intakeArtifact = await createIngestedArtifact(sampleBytes, {
    mediaType: "text/markdown",
    originalName: "test.md",
  });
  assert.equal(kernelArtifact.identity, intakeArtifact.identity);
  assert.equal(kernelArtifact.byteLength, intakeArtifact.byteLength);
  assert.equal(intakeArtifact.identity, sha256(sampleBytes));
});
