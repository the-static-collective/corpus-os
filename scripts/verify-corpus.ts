import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createArtifactRef,
  createTextSpanSelector,
  sha256,
  verifyTextSpan,
} from "../kernel/index.js";
import { ring6Snapshot } from "../kernel/ring6.js";

interface ManifestArtifact {
  path: string;
  mediaType: string;
  bytes: number;
  sha256: string;
}

interface Manifest {
  schema: string;
  status: string;
  artifacts: ManifestArtifact[];
  declaredAbsences: unknown[];
}

const root = process.cwd();
const manifestPath = resolve(root, "corpus/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
const artifactBytes = new Map<string, Uint8Array>();

for (const artifact of manifest.artifacts) {
  const bytes = await readFile(resolve(root, artifact.path));
  const identity = sha256(bytes);
  if (identity !== `sha256:${artifact.sha256}`) {
    throw new Error(`${artifact.path}: raw identity mismatch`);
  }
  if (bytes.byteLength !== artifact.bytes) {
    throw new Error(`${artifact.path}: byte length mismatch`);
  }
  artifactBytes.set(artifact.path, bytes);
}

for (const occurrence of ring6Snapshot.occurrences) {
  const bytes = artifactBytes.get(occurrence.sourcePath);
  if (!bytes) throw new Error(`${occurrence.id}: source artifact is not admitted`);
  const text = new TextDecoder().decode(bytes);
  const artifact = createArtifactRef(bytes, {
    mediaType: "text/plain",
    originalName: occurrence.sourcePath,
  });
  const selector = createTextSpanSelector(artifact, text, occurrence.quote);
  if (selector.byteStart !== occurrence.byteStart || selector.byteEnd !== occurrence.byteEnd) {
    throw new Error(`${occurrence.id}: generated selector differs from the fixture`);
  }
  if (selector.selectedTextHash !== occurrence.selectedTextHash) {
    throw new Error(`${occurrence.id}: selected-text hash differs from the fixture`);
  }
  const verification = verifyTextSpan(bytes, selector);
  if (!verification.valid) {
    throw new Error(`${occurrence.id}: ${verification.code}`);
  }
}

const result = {
  manifest: manifest.schema,
  status: manifest.status,
  artifactsVerified: manifest.artifacts.length,
  bytesVerified: [...artifactBytes.values()].reduce((total, bytes) => total + bytes.byteLength, 0),
  exactSelectorsVerified: ring6Snapshot.occurrences.length,
  declaredAbsences: manifest.declaredAbsences.length,
  canonicalJsonIdentity: "blocked",
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
