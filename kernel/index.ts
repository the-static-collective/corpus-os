import { createHash } from "node:crypto";

import type {
  Branch,
  ExactOccurrence,
  LineageNode,
  Tension,
} from "../lib/ring6-fixture.js";

export interface ArtifactRef {
  identity: `sha256:${string}`;
  mediaType: string;
  originalName: string;
  byteLength: number;
}

export interface TextSpanSelector {
  artifactIdentity: `sha256:${string}`;
  byteStart: number;
  byteEnd: number;
  lineStart: number;
  lineEnd: number;
  selectedTextHash: `sha256:${string}`;
  contextBeforeHash?: `sha256:${string}`;
  contextAfterHash?: `sha256:${string}`;
}

export interface SelectorVerification {
  valid: boolean;
  code:
    | "verified"
    | "artifact_identity_mismatch"
    | "selector_out_of_bounds"
    | "selected_text_hash_mismatch";
  extractedBytes?: Uint8Array;
}

export interface CorpusSnapshot {
  particularId: string;
  occurrences: ExactOccurrence[];
  lineage: LineageNode[];
  branches: Branch[];
  tensions: Tension[];
}

export interface ReturnRoute {
  nodeId: string;
  occurrenceId: string;
  classification: "quotation" | "lineage" | "evidence";
  status: "resolved" | "bounded" | "broken";
  hops: number;
  sourcePath: string;
  selector: Pick<TextSpanSelector, "artifactIdentity" | "byteStart" | "byteEnd" | "selectedTextHash">;
  unresolvedUpstream?: string;
}

export interface BranchExportDraft {
  schema: "corpus-os.branch-export-draft.v0";
  status: "portable_draft_unsealed";
  canonicalIdentity: null;
  canonicalAddressing: {
    status: "blocked";
    dependency: "Project 0 issue #5";
  };
  branch: Branch;
  roots: ExactOccurrence[];
}

export interface CanonicalAddressingPort {
  version: string;
  addressJson(value: unknown): Promise<`sha256:${string}`> | `sha256:${string}`;
}

export interface SealedBranchExport extends Omit<BranchExportDraft, "status" | "canonicalIdentity" | "canonicalAddressing"> {
  status: "canonically_addressed";
  canonicalIdentity: `sha256:${string}`;
  canonicalAddressing: {
    status: "adopted";
    version: string;
  };
}

export class CanonicalAddressingBlockedError extends Error {
  readonly code = "canonical_addressing_blocked";

  constructor() {
    super("Project 0 issue #5 must adopt the one canonical JSON addressing implementation before Corpus OS can seal branch manifests.");
  }
}

export function sha256(bytes: Uint8Array | string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function createArtifactRef(
  bytes: Uint8Array,
  metadata: Pick<ArtifactRef, "mediaType" | "originalName">,
): ArtifactRef {
  return {
    identity: sha256(bytes),
    byteLength: bytes.byteLength,
    mediaType: metadata.mediaType,
    originalName: metadata.originalName,
  };
}

export function createTextSpanSelector(
  artifact: ArtifactRef,
  sourceText: string,
  selectedText: string,
): TextSpanSelector {
  const characterStart = sourceText.indexOf(selectedText);
  if (characterStart < 0) {
    throw new Error("Selected text is not present in the admitted source.");
  }

  const characterEnd = characterStart + selectedText.length;
  const prefix = sourceText.slice(0, characterStart);
  const selected = sourceText.slice(characterStart, characterEnd);
  const suffix = sourceText.slice(characterEnd);
  const byteStart = Buffer.byteLength(prefix, "utf8");
  const byteEnd = byteStart + Buffer.byteLength(selected, "utf8");
  const lineStart = prefix.split("\n").length;
  const lineEnd = lineStart + selected.split("\n").length - 1;
  const contextBefore = prefix.slice(-96);
  const contextAfter = suffix.slice(0, 96);

  return {
    artifactIdentity: artifact.identity,
    byteStart,
    byteEnd,
    lineStart,
    lineEnd,
    selectedTextHash: sha256(selected),
    contextBeforeHash: sha256(contextBefore),
    contextAfterHash: sha256(contextAfter),
  };
}

export function verifyTextSpan(
  artifactBytes: Uint8Array,
  selector: TextSpanSelector,
): SelectorVerification {
  if (sha256(artifactBytes) !== selector.artifactIdentity) {
    return { valid: false, code: "artifact_identity_mismatch" };
  }

  if (
    selector.byteStart < 0 ||
    selector.byteEnd <= selector.byteStart ||
    selector.byteEnd > artifactBytes.byteLength
  ) {
    return { valid: false, code: "selector_out_of_bounds" };
  }

  const extractedBytes = artifactBytes.slice(selector.byteStart, selector.byteEnd);
  if (sha256(extractedBytes) !== selector.selectedTextHash) {
    return { valid: false, code: "selected_text_hash_mismatch", extractedBytes };
  }

  return { valid: true, code: "verified", extractedBytes };
}

function stable<T>(values: T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

export function sourceOccurrences(particularId: string, snapshot: CorpusSnapshot): ExactOccurrence[] {
  if (particularId !== snapshot.particularId) return [];
  return stable(snapshot.occurrences, (item) => `${item.sourcePath}:${String(item.byteStart).padStart(12, "0")}:${item.id}`);
}

export function lineageOf(nodeId: string, snapshot: CorpusSnapshot): LineageNode[] {
  const root = snapshot.lineage.find((node) => node.id === nodeId);
  if (!root) return [];
  const relevantOccurrence = root.occurrenceId;
  return stable(
    snapshot.lineage.filter((node) =>
      node.id === nodeId ||
      (relevantOccurrence !== undefined && node.occurrenceId === relevantOccurrence),
    ),
    (node) => `${node.kind}:${node.id}`,
  );
}

export function returnRoutes(nodeId: string, snapshot: CorpusSnapshot): ReturnRoute[] {
  const node = snapshot.lineage.find((candidate) => candidate.id === nodeId);
  const branch = snapshot.branches.find((candidate) => candidate.id === nodeId);
  const occurrenceIds = node?.occurrenceId
    ? [node.occurrenceId]
    : branch?.rootOccurrenceIds ?? [];

  return stable(
    occurrenceIds.flatMap((occurrenceId) => {
      const occurrence = snapshot.occurrences.find((candidate) => candidate.id === occurrenceId);
      if (!occurrence) return [];
      return [{
        nodeId,
        occurrenceId,
        classification: node?.kind === "source" ? "quotation" as const : "lineage" as const,
        status: occurrence.verification === "verified" ? "resolved" as const : "bounded" as const,
        hops: occurrence.returnHops,
        sourcePath: occurrence.sourcePath,
        selector: {
          artifactIdentity: occurrence.sourceHash as `sha256:${string}`,
          byteStart: occurrence.byteStart,
          byteEnd: occurrence.byteEnd,
          selectedTextHash: occurrence.selectedTextHash as `sha256:${string}`,
        },
        unresolvedUpstream: occurrence.verification === "verified" ? undefined : occurrence.citedOrigin,
      }];
    }),
    (route) => `${route.sourcePath}:${String(route.selector.byteStart).padStart(12, "0")}`,
  );
}

export function branchesFrom(occurrenceId: string, snapshot: CorpusSnapshot): Branch[] {
  return stable(
    snapshot.branches.filter((branch) => branch.rootOccurrenceIds.includes(occurrenceId)),
    (branch) => branch.id,
  );
}

export function disagreementsFor(particularId: string, snapshot: CorpusSnapshot): Branch[] {
  if (particularId !== snapshot.particularId) return [];
  return stable(
    snapshot.branches.filter((branch) => branch.validation === "rejected" || branch.validation === "accepted_as_interpretation"),
    (branch) => `${branch.validation}:${branch.id}`,
  );
}

export function unresolved(snapshot: CorpusSnapshot): Tension[] {
  return stable(snapshot.tensions, (tension) => `${tension.status}:${tension.id}`);
}

export function exportBranchDraft(branchId: string, snapshot: CorpusSnapshot): BranchExportDraft {
  const branch = snapshot.branches.find((candidate) => candidate.id === branchId);
  if (!branch) throw new Error(`Unknown branch: ${branchId}`);

  const roots = stable(
    branch.rootOccurrenceIds.map((occurrenceId) => {
      const occurrence = snapshot.occurrences.find((candidate) => candidate.id === occurrenceId);
      if (!occurrence) throw new Error(`Branch root is missing: ${occurrenceId}`);
      return occurrence;
    }),
    (occurrence) => occurrence.id,
  );

  return {
    schema: "corpus-os.branch-export-draft.v0",
    status: "portable_draft_unsealed",
    canonicalIdentity: null,
    canonicalAddressing: {
      status: "blocked",
      dependency: "Project 0 issue #5",
    },
    branch,
    roots,
  };
}

export async function sealBranchExport(
  draft: BranchExportDraft,
  canonicalAddressing?: CanonicalAddressingPort,
): Promise<SealedBranchExport> {
  if (!canonicalAddressing) throw new CanonicalAddressingBlockedError();

  const addressableBody = {
    schema: draft.schema,
    branch: draft.branch,
    roots: draft.roots,
  };
  const canonicalIdentity = await canonicalAddressing.addressJson(addressableBody);
  return {
    schema: draft.schema,
    status: "canonically_addressed",
    canonicalIdentity,
    canonicalAddressing: {
      status: "adopted",
      version: canonicalAddressing.version,
    },
    branch: draft.branch,
    roots: draft.roots,
  };
}
