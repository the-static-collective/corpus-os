// Local Intake v0.1 — browser-compatible artifact ingestion.
//
// Reuses the kernel's SHA-256 hash law (SHA-256 over exact bytes, `sha256:`
// prefix) via the Web Crypto API. No canonical JSON identity, no persistence,
// no admission authority, no ontology. Every exported object retains
// canonicalIdentity: null until Project 0 #5 is adopted.

import type {
  ArtifactRef,
  SelectorVerification,
  TextSpanSelector,
} from "../kernel/index.js";

export type { ArtifactRef, SelectorVerification, TextSpanSelector };

export interface IntakeSessionBundle {
  schema: "corpus-os.local-intake-session.v0";
  status: "portable_draft_unsealed";
  canonicalIdentity: null;
  canonicalAddressing: {
    status: "blocked";
    dependency: "Project 0 issue #5";
  };
  artifact: ArtifactRef;
  selectors: TextSpanSelector[];
  sourceBytes: string;
  generatedAt: string;
}

export interface VerifiedReturn {
  valid: boolean;
  code: string;
  extractedBytes?: Uint8Array;
}

const ALLOWED_EXTENSIONS = ["txt", "md", "json"] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const MEDIA_TYPES: Record<AllowedExtension, string> = {
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
};

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export function detectMediaType(filename: string): string | null {
  const ext = extensionOf(filename);
  return (MEDIA_TYPES as Record<string, string>)[ext] ?? null;
}

export function isAllowedFile(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(extensionOf(filename) as AllowedExtension);
}

export async function sha256Bytes(bytes: Uint8Array): Promise<`sha256:${string}`> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * Decode bytes as UTF-8 with fatal mode. Returns null if the bytes are not
 * valid UTF-8 — the caller must reject malformed bytes before presenting
 * them as a faithful immutable text source.
 */
export function decodeFatalUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export async function createIngestedArtifact(
  bytes: Uint8Array,
  metadata: Pick<ArtifactRef, "mediaType" | "originalName">,
): Promise<ArtifactRef> {
  return {
    identity: await sha256Bytes(bytes),
    byteLength: bytes.byteLength,
    mediaType: metadata.mediaType,
    originalName: metadata.originalName,
  };
}

/**
 * Create a TextSpanSelector from explicit UTF-16 character offsets within the
 * source text. The caller MUST derive these offsets from the actual DOM Range
 * location, not from String.indexOf — indexOf resolves the wrong occurrence
 * when identical text appears more than once.
 */
export async function createIntakeSelector(
  artifact: ArtifactRef,
  sourceText: string,
  characterStart: number,
  characterEnd: number,
): Promise<TextSpanSelector> {
  if (
    !Number.isInteger(characterStart) ||
    !Number.isInteger(characterEnd) ||
    characterStart < 0 ||
    characterEnd <= characterStart ||
    characterEnd > sourceText.length
  ) {
    throw new Error(
      `Invalid character bounds: [${characterStart}, ${characterEnd}) within source of length ${sourceText.length}.`,
    );
  }

  const selected = sourceText.slice(characterStart, characterEnd);
  if (selected.length === 0) {
    throw new Error("Character bounds produce an empty selection.");
  }

  const prefix = sourceText.slice(0, characterStart);
  const suffix = sourceText.slice(characterEnd);
  const byteStart = utf8ByteLength(prefix);
  const byteEnd = byteStart + utf8ByteLength(selected);
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
    selectedTextHash: await sha256Bytes(new TextEncoder().encode(selected)),
    contextBeforeHash: await sha256Bytes(new TextEncoder().encode(contextBefore)),
    contextAfterHash: await sha256Bytes(new TextEncoder().encode(contextAfter)),
  };
}

export async function verifyIntakeSelector(
  artifactBytes: Uint8Array,
  selector: TextSpanSelector,
): Promise<SelectorVerification> {
  if ((await sha256Bytes(artifactBytes)) !== selector.artifactIdentity) {
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
  if ((await sha256Bytes(extractedBytes)) !== selector.selectedTextHash) {
    return { valid: false, code: "selected_text_hash_mismatch", extractedBytes };
  }

  return { valid: true, code: "verified", extractedBytes };
}

/**
 * Verify a selector against the artifact bytes and return the extracted bytes
 * only if verification passes. Unlike returnToBytes (which is a raw slice),
 * this function performs full verification (artifact identity, bounds, and
 * selected-text hash) before returning content.
 */
export async function verifiedReturn(
  artifactBytes: Uint8Array,
  selector: TextSpanSelector,
): Promise<VerifiedReturn> {
  const result = await verifyIntakeSelector(artifactBytes, selector);
  if (result.valid && result.extractedBytes) {
    return { valid: true, code: "verified", extractedBytes: result.extractedBytes };
  }
  return { valid: false, code: result.code };
}

export function returnToBytes(
  artifactBytes: Uint8Array,
  selector: TextSpanSelector,
): Uint8Array {
  return artifactBytes.slice(selector.byteStart, selector.byteEnd);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function exportSessionBundle(
  artifact: ArtifactRef,
  selectors: TextSpanSelector[],
  sourceBytes: Uint8Array,
): IntakeSessionBundle {
  return {
    schema: "corpus-os.local-intake-session.v0",
    status: "portable_draft_unsealed",
    canonicalIdentity: null,
    canonicalAddressing: {
      status: "blocked",
      dependency: "Project 0 issue #5",
    },
    artifact,
    selectors,
    sourceBytes: bytesToBase64(sourceBytes),
    generatedAt: new Date().toISOString(),
  };
}
