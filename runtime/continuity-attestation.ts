import type {
  OrphanObservation,
  ReachabilityIssue,
  TerminalHistoryEntry,
  WorldCut,
} from "./world-cut.js";

const ATTESTATION_SCHEMA = "corpus/continuity-attestation/v0.1" as const;
const PURPOSE = "corpus-worldcut-succession" as const;

export type AuthorityContinuity =
  | "none"
  | "separately-evidenced"
  | "unresolved";

export interface ContinuityTransitionEvidence {
  readonly kind: "transformed" | "lost";
  readonly priorRef: string;
  readonly currentRef?: string;
  readonly evidenceRef: string;
}

export interface DeriveCorpusContinuityAttestationInput {
  readonly priorCutRef: string;
  readonly currentCutRef: string;
  readonly priorCut: WorldCut;
  readonly currentCut: WorldCut;
  readonly transitionEvidence: readonly ContinuityTransitionEvidence[];
  readonly authorityContinuity: AuthorityContinuity;
  readonly authorityEvidenceRefs: readonly string[];
}

export interface TransformedContinuityRef {
  readonly priorRef: string;
  readonly currentRef: string;
  readonly evidenceRef: string;
}

export interface LostContinuityRef {
  readonly priorRef: string;
  readonly evidenceRef: string;
}

export interface CorpusContinuityAttestationV01 {
  readonly schema: typeof ATTESTATION_SCHEMA;
  readonly priorCutRef: string;
  readonly currentCutRef: string;
  readonly trustId: string;
  readonly purpose: typeof PURPOSE;
  readonly preservedRefs: readonly string[];
  readonly transformed: readonly TransformedContinuityRef[];
  readonly lost: readonly LostContinuityRef[];
  readonly unresolvedRefs: readonly string[];
  readonly priorTerminalHistory: readonly TerminalHistoryEntry[];
  readonly currentTerminalHistory: readonly TerminalHistoryEntry[];
  readonly priorUnresolved: readonly ReachabilityIssue[];
  readonly currentUnresolved: readonly ReachabilityIssue[];
  readonly priorOrphanObservations: readonly OrphanObservation[];
  readonly currentOrphanObservations: readonly OrphanObservation[];
  readonly transitionEvidenceRefs: readonly string[];
  readonly authorityCutChange: Readonly<{
    prior: string;
    current: string;
    changed: boolean;
  }>;
  readonly authorityContinuity: AuthorityContinuity;
  readonly authorityEvidenceRefs: readonly string[];
  readonly whyCurrent: Readonly<{
    currentCutRef: string;
    authorityCut: string;
    constitutedRefs: readonly string[];
    transitionEvidenceRefs: readonly string[];
  }>;
  readonly legalValidity: "unclaimed";
}

export type CorpusContinuityAttestationErrorCode =
  | "INVALID_INPUT"
  | "TRUST_MISMATCH"
  | "INVALID_TRANSITION_EVIDENCE"
  | "AMBIGUOUS_TRANSITION_EVIDENCE"
  | "MISSING_AUTHORITY_EVIDENCE";

export class CorpusContinuityAttestationError extends Error {
  constructor(
    public readonly code: CorpusContinuityAttestationErrorCode,
    public readonly detail?: string,
  ) {
    super(detail === undefined ? code : `${code}: ${detail}`);
    this.name = "CorpusContinuityAttestationError";
  }
}

function requiredString(value: unknown, detail: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CorpusContinuityAttestationError("INVALID_INPUT", detail);
  }
  return value;
}

function ownDataValue(
  value: object,
  key: string,
): { present: boolean; value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return { present: false, value: undefined };
  if (!("value" in descriptor)) {
    throw new CorpusContinuityAttestationError("INVALID_INPUT", `accessor:${key}`);
  }
  return { present: true, value: descriptor.value };
}

function plainArrayData(value: unknown, detail: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new CorpusContinuityAttestationError("INVALID_INPUT", detail);
  }

  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new CorpusContinuityAttestationError(
        "INVALID_INPUT",
        `${detail}:${index}`,
      );
    }
    result.push(descriptor.value);
  }
  return result;
}

function uniqueSortedStrings(value: unknown, detail: string): readonly string[] {
  const raw = plainArrayData(value, detail);
  const result: string[] = [];
  for (const item of raw) {
    const normalized = requiredString(item, detail);
    if (result.includes(normalized)) {
      throw new CorpusContinuityAttestationError("INVALID_INPUT", `duplicate:${detail}`);
    }
    result.push(normalized);
  }
  return Object.freeze(result.sort());
}

function parseTransitionEvidence(
  value: unknown,
): readonly ContinuityTransitionEvidence[] {
  const raw = plainArrayData(value, "transitionEvidence");
  const result: ContinuityTransitionEvidence[] = [];

  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new CorpusContinuityAttestationError(
        "INVALID_TRANSITION_EVIDENCE",
      );
    }

    const kindProperty = ownDataValue(item, "kind");
    const priorProperty = ownDataValue(item, "priorRef");
    const currentProperty = ownDataValue(item, "currentRef");
    const evidenceProperty = ownDataValue(item, "evidenceRef");

    const kind = kindProperty.value;
    if (kind !== "transformed" && kind !== "lost") {
      throw new CorpusContinuityAttestationError(
        "INVALID_TRANSITION_EVIDENCE",
        "kind",
      );
    }

    const priorRef = requiredString(priorProperty.value, "priorRef");
    const evidenceRef = requiredString(evidenceProperty.value, "evidenceRef");

    if (kind === "transformed") {
      const currentRef = requiredString(currentProperty.value, "currentRef");
      result.push(Object.freeze({ kind, priorRef, currentRef, evidenceRef }));
    } else {
      if (currentProperty.present) {
        throw new CorpusContinuityAttestationError(
          "INVALID_TRANSITION_EVIDENCE",
          "lost-currentRef",
        );
      }
      result.push(Object.freeze({ kind, priorRef, evidenceRef }));
    }
  }

  result.sort(
    (left, right) =>
      left.priorRef.localeCompare(right.priorRef) ||
      left.kind.localeCompare(right.kind) ||
      (left.currentRef ?? "").localeCompare(right.currentRef ?? "") ||
      left.evidenceRef.localeCompare(right.evidenceRef),
  );
  return Object.freeze(result);
}

function cloneTerminalHistory(
  history: readonly TerminalHistoryEntry[],
): readonly TerminalHistoryEntry[] {
  return Object.freeze(
    history.map((entry) =>
      Object.freeze({
        cause: Object.freeze({ ...entry.cause }),
        disposition: entry.disposition,
        outputRefs: Object.freeze([...entry.outputRefs]),
      }),
    ),
  );
}

function cloneUnresolved(
  unresolved: readonly ReachabilityIssue[],
): readonly ReachabilityIssue[] {
  return Object.freeze(unresolved.map((entry) => Object.freeze({ ...entry })));
}

function cloneOrphans(
  orphans: readonly OrphanObservation[],
): readonly OrphanObservation[] {
  return Object.freeze(orphans.map((entry) => Object.freeze({ ...entry })));
}

export function deriveCorpusContinuityAttestation(
  input: DeriveCorpusContinuityAttestationInput,
): Readonly<CorpusContinuityAttestationV01> {
  const priorCutRef = requiredString(input.priorCutRef, "priorCutRef");
  const currentCutRef = requiredString(input.currentCutRef, "currentCutRef");

  if (input.priorCut.root.trustId !== input.currentCut.root.trustId) {
    throw new CorpusContinuityAttestationError("TRUST_MISMATCH");
  }

  const authorityContinuity = input.authorityContinuity;
  if (
    authorityContinuity !== "none" &&
    authorityContinuity !== "separately-evidenced" &&
    authorityContinuity !== "unresolved"
  ) {
    throw new CorpusContinuityAttestationError(
      "INVALID_INPUT",
      "authorityContinuity",
    );
  }

  const authorityEvidenceRefs = uniqueSortedStrings(
    input.authorityEvidenceRefs,
    "authorityEvidenceRefs",
  );
  if (
    authorityContinuity === "separately-evidenced" &&
    authorityEvidenceRefs.length === 0
  ) {
    throw new CorpusContinuityAttestationError("MISSING_AUTHORITY_EVIDENCE");
  }

  const evidence = parseTransitionEvidence(input.transitionEvidence);
  const priorRefs = new Set(input.priorCut.constitutedRefs);
  const currentRefs = new Set(input.currentCut.constitutedRefs);

  const preservedRefs = Object.freeze(
    [...priorRefs].filter((ref) => currentRefs.has(ref)).sort(),
  );
  const priorOnly = new Set([...priorRefs].filter((ref) => !currentRefs.has(ref)));
  const currentOnly = new Set([...currentRefs].filter((ref) => !priorRefs.has(ref)));

  const transformed: TransformedContinuityRef[] = [];
  const lost: LostContinuityRef[] = [];
  const usedPrior = new Set<string>();
  const usedCurrent = new Set<string>();
  const usedEvidence = new Set<string>();

  for (const edge of evidence) {
    if (usedPrior.has(edge.priorRef) || usedEvidence.has(edge.evidenceRef)) {
      throw new CorpusContinuityAttestationError(
        "AMBIGUOUS_TRANSITION_EVIDENCE",
      );
    }
    if (!priorOnly.has(edge.priorRef)) {
      throw new CorpusContinuityAttestationError(
        "INVALID_TRANSITION_EVIDENCE",
        edge.priorRef,
      );
    }

    usedPrior.add(edge.priorRef);
    usedEvidence.add(edge.evidenceRef);

    if (edge.kind === "transformed") {
      const currentRef = edge.currentRef;
      if (
        currentRef === undefined ||
        !currentOnly.has(currentRef) ||
        usedCurrent.has(currentRef)
      ) {
        throw new CorpusContinuityAttestationError(
          "INVALID_TRANSITION_EVIDENCE",
          currentRef,
        );
      }
      usedCurrent.add(currentRef);
      transformed.push(
        Object.freeze({
          priorRef: edge.priorRef,
          currentRef,
          evidenceRef: edge.evidenceRef,
        }),
      );
    } else {
      lost.push(
        Object.freeze({
          priorRef: edge.priorRef,
          evidenceRef: edge.evidenceRef,
        }),
      );
    }
  }

  transformed.sort(
    (left, right) =>
      left.priorRef.localeCompare(right.priorRef) ||
      left.currentRef.localeCompare(right.currentRef) ||
      left.evidenceRef.localeCompare(right.evidenceRef),
  );
  lost.sort(
    (left, right) =>
      left.priorRef.localeCompare(right.priorRef) ||
      left.evidenceRef.localeCompare(right.evidenceRef),
  );

  const unresolvedRefs = Object.freeze(
    [
      ...[...priorOnly].filter((ref) => !usedPrior.has(ref)),
      ...[...currentOnly].filter((ref) => !usedCurrent.has(ref)),
    ].sort(),
  );
  const transitionEvidenceRefs = Object.freeze(
    [...usedEvidence].sort(),
  );
  const currentConstitutedRefs = Object.freeze([
    ...input.currentCut.constitutedRefs,
  ]);

  const authorityCutChange = Object.freeze({
    prior: input.priorCut.root.authorityCut,
    current: input.currentCut.root.authorityCut,
    changed:
      input.priorCut.root.authorityCut !== input.currentCut.root.authorityCut,
  });
  const whyCurrent = Object.freeze({
    currentCutRef,
    authorityCut: input.currentCut.root.authorityCut,
    constitutedRefs: currentConstitutedRefs,
    transitionEvidenceRefs,
  });

  return Object.freeze({
    schema: ATTESTATION_SCHEMA,
    priorCutRef,
    currentCutRef,
    trustId: input.currentCut.root.trustId,
    purpose: PURPOSE,
    preservedRefs,
    transformed: Object.freeze(transformed),
    lost: Object.freeze(lost),
    unresolvedRefs,
    priorTerminalHistory: cloneTerminalHistory(input.priorCut.terminalHistory),
    currentTerminalHistory: cloneTerminalHistory(input.currentCut.terminalHistory),
    priorUnresolved: cloneUnresolved(input.priorCut.unresolved),
    currentUnresolved: cloneUnresolved(input.currentCut.unresolved),
    priorOrphanObservations: cloneOrphans(input.priorCut.orphanObservations),
    currentOrphanObservations: cloneOrphans(input.currentCut.orphanObservations),
    transitionEvidenceRefs,
    authorityCutChange,
    authorityContinuity,
    authorityEvidenceRefs,
    whyCurrent,
    legalValidity: "unclaimed",
  });
}
