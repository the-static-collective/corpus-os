import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CanonicalAddressingBlockedError,
  branchesFrom,
  createArtifactRef,
  createTextSpanSelector,
  disagreementsFor,
  exportBranchDraft,
  lineageOf,
  returnRoutes,
  sealBranchExport,
  sha256,
  sourceOccurrences,
  unresolved,
  verifyTextSpan,
} from "../.kernel-dist/kernel/index.js";
import { ring6Snapshot } from "../.kernel-dist/kernel/ring6.js";

const sourcePath = new URL(
  "../corpus/sources/latent-design-grammar/curated_evidence.json",
  import.meta.url,
);
const sourceBytes = await readFile(sourcePath);
const sourceText = sourceBytes.toString("utf8");
const selectedText = "ring_6 is the only ring that was built from the inside — the daughter as architect, not subject";

test("raw artifact identity is SHA-256 over exact bytes", () => {
  const artifact = createArtifactRef(sourceBytes, {
    mediaType: "application/json",
    originalName: "curated_evidence.json",
  });
  assert.equal(
    artifact.identity,
    "sha256:5f9fc4e741aaacd0a2135616cd64da7435e6eff0735219ccb88afe06e2aae7db",
  );
  assert.equal(artifact.byteLength, 42810);
});

test("exact UTF-8 selector resolves and verifies", () => {
  const artifact = createArtifactRef(sourceBytes, {
    mediaType: "application/json",
    originalName: "curated_evidence.json",
  });
  const selector = createTextSpanSelector(artifact, sourceText, selectedText);
  assert.equal(selector.byteStart, 34498);
  assert.equal(selector.byteEnd, 34595);
  assert.equal(
    selector.selectedTextHash,
    "sha256:a54a62574a9b40945eaf83583c26ed287a7b222174abd5efede144771d368787",
  );
  assert.equal(verifyTextSpan(sourceBytes, selector).code, "verified");
});

test("corrupted selector fails closed", () => {
  const artifact = createArtifactRef(sourceBytes, {
    mediaType: "application/json",
    originalName: "curated_evidence.json",
  });
  const selector = createTextSpanSelector(artifact, sourceText, selectedText);
  assert.equal(
    verifyTextSpan(sourceBytes, { ...selector, byteStart: selector.byteStart + 1 }).code,
    "selected_text_hash_mismatch",
  );
});

test("artifact substitution fails before selector comparison", () => {
  const artifact = createArtifactRef(sourceBytes, {
    mediaType: "application/json",
    originalName: "curated_evidence.json",
  });
  const selector = createTextSpanSelector(artifact, sourceText, selectedText);
  assert.equal(
    verifyTextSpan(Buffer.from(`${sourceText}tamper`), selector).code,
    "artifact_identity_mismatch",
  );
});

test("quotation and inference remain mechanically distinct", () => {
  const sourceNode = ring6Snapshot.lineage.find((node) => node.kind === "source");
  const inferenceNode = ring6Snapshot.lineage.find((node) => node.kind === "inference");
  assert.equal(sourceNode?.kind, "source");
  assert.equal(inferenceNode?.kind, "inference");
  assert.equal(returnRoutes(sourceNode.id, ring6Snapshot)[0].classification, "quotation");
  assert.equal(returnRoutes(inferenceNode.id, ring6Snapshot)[0].classification, "lineage");
});

test("source occurrence ordering ignores insertion order", () => {
  const expected = sourceOccurrences("ring_6", ring6Snapshot).map((item) => item.id);
  const shuffled = sourceOccurrences("ring_6", {
    ...ring6Snapshot,
    occurrences: [...ring6Snapshot.occurrences].reverse(),
  }).map((item) => item.id);
  assert.deepEqual(shuffled, expected);
});

test("two accepted readings survive without forced merge", () => {
  const readings = disagreementsFor("ring_6", ring6Snapshot);
  assert.equal(readings.filter((branch) => branch.validation === "accepted_as_interpretation").length, 2);
});

test("rejected proposal remains queryable", () => {
  const readings = disagreementsFor("ring_6", ring6Snapshot);
  assert.equal(readings.find((branch) => branch.validation === "rejected")?.id, "branch_recursive_memory");
  assert.equal(ring6Snapshot.lineage.find((node) => node.kind === "rejection")?.status, "rejected");
});

test("unresolved tensions retain explicit blockers", () => {
  const results = unresolved(ring6Snapshot);
  assert.equal(results.length, 3);
  assert.equal(results.filter((item) => item.status === "blocked").length, 2);
});

test("semantic neighbor without accepted lineage returns nothing", () => {
  assert.deepEqual(lineageOf("semantic_neighbor_only", ring6Snapshot), []);
});

test("branch traversal returns only declared roots", () => {
  assert.deepEqual(
    branchesFrom("occ_ring6_inside", ring6Snapshot).map((branch) => branch.id),
    ["branch_particular_agency"],
  );
  assert.equal(returnRoutes("branch_transit", ring6Snapshot).length, 2);
});

test("portable branch draft preserves roots but makes no seal claim", () => {
  const draft = exportBranchDraft("branch_transit", ring6Snapshot);
  assert.equal(draft.status, "portable_draft_unsealed");
  assert.equal(draft.canonicalIdentity, null);
  assert.deepEqual(draft.roots.map((root) => root.id), ["occ_return_edges", "occ_room_to_cross"]);
});

test("sealing is mechanically blocked without the adopted canonicalizer", async () => {
  const draft = exportBranchDraft("branch_transit", ring6Snapshot);
  await assert.rejects(
    () => sealBranchExport(draft),
    (error) => error instanceof CanonicalAddressingBlockedError,
  );
});

test("unknown branch cannot be exported", () => {
  assert.throws(() => exportBranchDraft("missing", ring6Snapshot), /Unknown branch/);
});

test("SHA-256 helper never assigns semantic validation", () => {
  assert.equal(sha256("accepted"), "sha256:070c160a6299c5438070b1aa737b14fc2992ed49579c14264884886a5876f971");
  assert.equal(sha256("rejected"), "sha256:20cd938a2ea64f612b3523bc9219130c6fc66cd09b394ea38437488c0b8898b2");
});
