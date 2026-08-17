export const CORPUS_WORLD_ENCOUNTER_POLICY_REF =
  "corpus-os:policy:world-encounter:v0.1" as const;

export const CORPUS_WORLD_ENCOUNTER_CAPABILITY =
  "corpus.receive-public-source-ref/v0.1" as const;

export const CORPUS_WORLD_ENCOUNTER_FRAME_REF =
  "corpus-os:world-encounter:v0.1" as const;

export const PROJECT0_WORLD_ENCOUNTER_PROTOCOL = "p0.exchange/0.1" as const;

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

type ConstitutionalReasonCode =
  | "CORPUS_ENCOUNTER_ADMITTED"
  | "CORPUS_CAPABILITY_UNDECLARED"
  | "CORPUS_DESTINATION_POLICY_REQUIRED"
  | "CORPUS_PROTOCOL_UNSUPPORTED"
  | "CORPUS_DISCLOSURE_NOT_ACCEPTED"
  | "CORPUS_SOURCE_TYPE_NOT_ACCEPTED"
  | "CORPUS_SOURCE_VERIFICATION_UNRESOLVED";

export type CorpusWorldEncounterDisposition =
  | {
      schema: "corpus.world-encounter-disposition/v0.1";
      status: "admitted" | "refused" | "indeterminate";
      reasonCode: ConstitutionalReasonCode;
      authority: "none";
      destinationFrameRef: typeof CORPUS_WORLD_ENCOUNTER_FRAME_REF;
      encounterRef: string;
      inspectedObject: false;
      destinationPolicyEvidenceRefs: string[];
      evidenceRefs: string[];
    }
  | {
      schema: "corpus.world-encounter-disposition/v0.1";
      status: "failed";
      failureClass: "CORPUS_DESTINATION_RUNTIME_FAILURE";
      authority: "none";
      destinationFrameRef: typeof CORPUS_WORLD_ENCOUNTER_FRAME_REF;
      encounterRef?: string;
      destinationPolicyEvidenceRefs: [];
      evidenceRefs: string[];
    };

export interface WorldEncounterDestinationOptions {
  policyEnabled?: boolean;
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
  Object.freeze(value.destinationPolicyEvidenceRefs);
  Object.freeze(value.evidenceRefs);
  return Object.freeze(value);
}

function constitutionalDisposition(
  request: CorpusWorldEncounterRequest,
  policyEvidenceRefs: readonly string[],
  status: "admitted" | "refused" | "indeterminate",
  reasonCode: ConstitutionalReasonCode,
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
    authority: "none",
    destinationFrameRef: CORPUS_WORLD_ENCOUNTER_FRAME_REF,
    encounterRef: request.encounter.ref,
    inspectedObject: false,
    destinationPolicyEvidenceRefs: sortedUnique(policyEvidenceRefs),
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
  if (typeof request.encounter.body.protocolVersion !== "string") {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (typeof request.encounter.body.offered.objectRef !== "string") {
    throw new Error("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
  }
  if (typeof request.encounter.body.offered.disclosureClass !== "string") {
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
  const policyEnabled = options.policyEnabled ?? true;
  const policyEvidenceRefs = Object.freeze(
    policyEnabled ? [CORPUS_WORLD_ENCOUNTER_POLICY_REF] : [],
  );

  return Object.freeze({
    evaluate(request: CorpusWorldEncounterRequest): CorpusWorldEncounterDisposition {
      requireRequestShape(request);

      if (request.capability !== CORPUS_WORLD_ENCOUNTER_CAPABILITY) {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "refused",
          "CORPUS_CAPABILITY_UNDECLARED",
        );
      }

      if (!policyEnabled) {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "refused",
          "CORPUS_DESTINATION_POLICY_REQUIRED",
        );
      }

      if (request.encounter.body.protocolVersion !== PROJECT0_WORLD_ENCOUNTER_PROTOCOL) {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "refused",
          "CORPUS_PROTOCOL_UNSUPPORTED",
        );
      }

      if (request.encounter.body.offered.disclosureClass !== "public") {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "refused",
          "CORPUS_DISCLOSURE_NOT_ACCEPTED",
        );
      }

      if (request.encounter.body.sourceEpistemicKind !== "source") {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "refused",
          "CORPUS_SOURCE_TYPE_NOT_ACCEPTED",
        );
      }

      if (request.encounter.body.sourceVerificationState !== "verified") {
        return constitutionalDisposition(
          request,
          policyEvidenceRefs,
          "indeterminate",
          "CORPUS_SOURCE_VERIFICATION_UNRESOLVED",
        );
      }

      return constitutionalDisposition(
        request,
        policyEvidenceRefs,
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
      authority: "none",
      destinationFrameRef: CORPUS_WORLD_ENCOUNTER_FRAME_REF,
      ...(encounterRef ? { encounterRef } : {}),
      destinationPolicyEvidenceRefs: [],
      evidenceRefs: encounterRef ? [encounterRef] : [],
    });
  }
}
