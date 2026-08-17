export const CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF =
  "corpus-os:authority:world-encounter:v0.1" as const;

export const CORPUS_WORLD_ENCOUNTER_CAPABILITY =
  "corpus.receive-public-source-ref/v0.1" as const;

export const CORPUS_WORLD_ENCOUNTER_FRAME_REF =
  "corpus-os:world-encounter:v0.1" as const;

export type CorpusWorldEncounterRequest = {
  schema: "corpus.world-encounter-destination/v0.1";
  capability: typeof CORPUS_WORLD_ENCOUNTER_CAPABILITY | string;
  encounter: {
    ref: string;
    body: {
      protocolVersion: string;
      offered: {
        objectRef: string;
        mediaType: string | null;
        sourceReceiptRefs: string[];
        disclosureClass: string;
      };
      sourceAuthorityRefs: string[];
      sourceProvenanceRefs: string[];
      sourceEpistemicKind: string;
      sourceVerificationState: string;
    };
  };
};

export type CorpusWorldEncounterDisposition =
  | {
      schema: "corpus.world-encounter-disposition/v0.1";
      status: "admitted" | "refused" | "indeterminate";
      reasonCode:
        | "CORPUS_ENCOUNTER_ADMITTED"
        | "CORPUS_CAPABILITY_UNDECLARED"
        | "CORPUS_DESTINATION_AUTHORITY_REQUIRED"
        | "CORPUS_SOURCE_AUTHORITY_NOT_LOCAL"
        | "CORPUS_DISCLOSURE_NOT_ACCEPTED"
        | "CORPUS_SOURCE_TYPE_NOT_ACCEPTED"
        | "CORPUS_SOURCE_VERIFICATION_UNRESOLVED";
      destinationFrameRef: typeof CORPUS_WORLD_ENCOUNTER_FRAME_REF;
      encounterRef: string;
      inspectedObject: false;
      destinationAuthorityEvidenceRefs: string[];
      evidenceRefs: string[];
    }
  | {
      schema: "corpus.world-encounter-disposition/v0.1";
      status: "failed";
      failureClass: "CORPUS_DESTINATION_RUNTIME_FAILURE";
      destinationFrameRef: typeof CORPUS_WORLD_ENCOUNTER_FRAME_REF;
      encounterRef?: string;
      destinationAuthorityEvidenceRefs: [];
      evidenceRefs: string[];
    };

export interface WorldEncounterDestinationOptions {
  localAuthorityRefs?: readonly string[];
}

export interface WorldEncounterDestination {
  evaluate(request: CorpusWorldEncounterRequest): CorpusWorldEncounterDisposition;
}

export type WorldEncounterEvaluator = (
  request: CorpusWorldEncounterRequest,
) => CorpusWorldEncounterDisposition;

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function freezeDisposition<T extends CorpusWorldEncounterDisposition>(value: T): T {
  Object.freeze(value.destinationAuthorityEvidenceRefs);
  Object.freeze(value.evidenceRefs);
  return Object.freeze(value);
}

function constitutionalDisposition(
  request: CorpusWorldEncounterRequest,
  localAuthorityRefs: readonly string[],
  status: "admitted" | "refused" | "indeterminate",
  reasonCode: Extract<CorpusWorldEncounterDisposition, { status: "admitted" | "refused" | "indeterminate" }>["reasonCode"],
): CorpusWorldEncounterDisposition {
  const evidenceRefs = sortedUnique([
    request.encounter.ref,
    request.encounter.body.offered.objectRef,
    ...request.encounter.body.offered.sourceReceiptRefs,
    ...request.encounter.body.sourceProvenanceRefs,
  ]);

  return freezeDisposition({
    schema: "corpus.world-encounter-disposition/v0.1",
    status,
    reasonCode,
    destinationFrameRef: CORPUS_WORLD_ENCOUNTER_FRAME_REF,
    encounterRef: request.encounter.ref,
    inspectedObject: false,
    destinationAuthorityEvidenceRefs: sortedUnique(localAuthorityRefs),
    evidenceRefs,
  });
}

function requireRequestShape(request: CorpusWorldEncounterRequest): void {
  if (request.schema !== "corpus.world-encounter-destination/v0.1") {
    throw new Error("CORPUS_WORLD_ENCOUNTER_UNSUPPORTED_SCHEMA");
  }
  if (!request.encounter || typeof request.encounter.ref !== "string" || request.encounter.ref.length === 0) {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (!request.encounter.body || !request.encounter.body.offered) {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (!Array.isArray(request.encounter.body.sourceAuthorityRefs)) {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (!Array.isArray(request.encounter.body.sourceProvenanceRefs)) {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (!Array.isArray(request.encounter.body.offered.sourceReceiptRefs)) {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
}

export function createWorldEncounterDestination(
  options: WorldEncounterDestinationOptions = {},
): WorldEncounterDestination {
  const localAuthorityRefs = Object.freeze(
    sortedUnique(options.localAuthorityRefs ?? [CORPUS_WORLD_ENCOUNTER_AUTHORITY_REF]),
  );

  return Object.freeze({
    evaluate(request: CorpusWorldEncounterRequest): CorpusWorldEncounterDisposition {
      requireRequestShape(request);

      if (request.capability !== CORPUS_WORLD_ENCOUNTER_CAPABILITY) {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "refused",
          "CORPUS_CAPABILITY_UNDECLARED",
        );
      }

      if (localAuthorityRefs.length === 0) {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "refused",
          "CORPUS_DESTINATION_AUTHORITY_REQUIRED",
        );
      }

      const sourceAuthority = new Set(request.encounter.body.sourceAuthorityRefs);
      if (localAuthorityRefs.some((ref) => sourceAuthority.has(ref))) {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "refused",
          "CORPUS_SOURCE_AUTHORITY_NOT_LOCAL",
        );
      }

      if (request.encounter.body.offered.disclosureClass !== "public") {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "refused",
          "CORPUS_DISCLOSURE_NOT_ACCEPTED",
        );
      }

      if (request.encounter.body.sourceEpistemicKind !== "source") {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "refused",
          "CORPUS_SOURCE_TYPE_NOT_ACCEPTED",
        );
      }

      if (request.encounter.body.sourceVerificationState !== "verified") {
        return constitutionalDisposition(
          request,
          localAuthorityRefs,
          "indeterminate",
          "CORPUS_SOURCE_VERIFICATION_UNRESOLVED",
        );
      }

      return constitutionalDisposition(
        request,
        localAuthorityRefs,
        "admitted",
        "CORPUS_ENCOUNTER_ADMITTED",
      );
    },
  });
}

const defaultDestination = createWorldEncounterDestination();

export function evaluateWorldEncounterDestination(
  request: CorpusWorldEncounterRequest,
): CorpusWorldEncounterDisposition {
  return defaultDestination.evaluate(request);
}

export function runWorldEncounterDestination(
  request: CorpusWorldEncounterRequest,
  evaluator: WorldEncounterEvaluator = evaluateWorldEncounterDestination,
): CorpusWorldEncounterDisposition {
  try {
    return evaluator(request);
  } catch {
    const encounterRef =
      typeof request === "object" && request !== null &&
      typeof request.encounter === "object" && request.encounter !== null &&
      typeof request.encounter.ref === "string"
        ? request.encounter.ref
        : undefined;

    return freezeDisposition({
      schema: "corpus.world-encounter-disposition/v0.1",
      status: "failed",
      failureClass: "CORPUS_DESTINATION_RUNTIME_FAILURE",
      destinationFrameRef: CORPUS_WORLD_ENCOUNTER_FRAME_REF,
      ...(encounterRef ? { encounterRef } : {}),
      destinationAuthorityEvidenceRefs: [],
      evidenceRefs: encounterRef ? [encounterRef] : [],
    });
  }
}
