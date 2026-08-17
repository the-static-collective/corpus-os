import type { CorpusHostPort } from "../host/linux/host-port.js";
import type { TrustOperationRequest } from "../lib/trust-runtime.js";
import { loadAdoptedDeclaration } from "./adopted-declaration.js";
import { CorpusSession } from "./session.js";
import { WarrantedCorpusSession } from "./warranted-session.js";

export const WORLD_ENCOUNTER_REQUEST_SCHEMA =
  "corpus-os/world-encounter-admission/v0.1" as const;
export const WORLD_ENCOUNTER_RESULT_SCHEMA =
  "corpus-os/world-encounter-result/v0.1" as const;
export const WORLD_ENCOUNTER_DESTINATION_FRAME =
  "corpus-os:casework-v0.1" as const;
export const WORLD_ENCOUNTER_PROFILE =
  "casework.synthetic-echo/v0.1" as const;

const LOCAL_ACTOR_ID = "person:administrator";
const LOCAL_CAPACITY = "administrator" as const;
const LOCAL_CAPABILITY_ID = "synthetic.echo";
const LOCAL_CAPABILITY_OPERATION = "echo";
const ADOPTED_DECLARATION_EVIDENCE_REF =
  "fixtures/trusts/casework.synthetic.json";

export interface WorldEncounterAdmissionRequest {
  readonly schema: typeof WORLD_ENCOUNTER_REQUEST_SCHEMA;
  readonly envelopeRef: string;
  readonly destinationFrameRef: string;
  readonly profile: string;
  readonly destinationSubjectRef?: string;
  readonly input: string;
}

export type WorldEncounterDisposition =
  | "admitted"
  | "refused"
  | "indeterminate"
  | "failed";

export interface WorldEncounterAdmissionResult {
  readonly schema: typeof WORLD_ENCOUNTER_RESULT_SCHEMA;
  readonly status: WorldEncounterDisposition;
  readonly reasonCode: string;
  readonly envelopeRef: string;
  readonly destinationFrameRef: string;
  readonly profile: string;
  readonly callerAuthenticated: false;
  readonly authorityTransfer: "none";
  readonly legalValidity: "unclaimed";
  readonly receiptRequestId?: string;
  readonly outputRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
}

export interface WorldEncounterAdmissionOptions {
  readonly hostPort?: CorpusHostPort;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function result(
  request: Pick<
    WorldEncounterAdmissionRequest,
    "envelopeRef" | "destinationFrameRef" | "profile"
  >,
  status: WorldEncounterDisposition,
  reasonCode: string,
  additions: {
    receiptRequestId?: string;
    outputRefs?: readonly string[];
    evidenceRefs?: readonly string[];
  } = {},
): WorldEncounterAdmissionResult {
  return Object.freeze({
    schema: WORLD_ENCOUNTER_RESULT_SCHEMA,
    status,
    reasonCode,
    envelopeRef: request.envelopeRef,
    destinationFrameRef: request.destinationFrameRef,
    profile: request.profile,
    callerAuthenticated: false,
    authorityTransfer: "none",
    legalValidity: "unclaimed",
    receiptRequestId: additions.receiptRequestId,
    outputRefs: Object.freeze([...(additions.outputRefs ?? [])]),
    evidenceRefs: Object.freeze(
      unique([request.envelopeRef, ...(additions.evidenceRefs ?? [])]),
    ),
  });
}

export function refuseCallerAuthorityAttempt(
  request: Pick<
    WorldEncounterAdmissionRequest,
    "envelopeRef" | "destinationFrameRef" | "profile"
  >,
): WorldEncounterAdmissionResult {
  return result(request, "refused", "CALLER_AUTHORITY_NOT_ACCEPTED");
}

export async function evaluateWorldEncounterAdmission(
  request: WorldEncounterAdmissionRequest,
  options: WorldEncounterAdmissionOptions = {},
): Promise<WorldEncounterAdmissionResult> {
  if (request.destinationFrameRef !== WORLD_ENCOUNTER_DESTINATION_FRAME) {
    return result(request, "indeterminate", "DESTINATION_FRAME_UNRESOLVED");
  }

  if (request.profile !== WORLD_ENCOUNTER_PROFILE) {
    return result(request, "refused", "DESTINATION_PROFILE_NOT_DECLARED");
  }

  if (!request.destinationSubjectRef) {
    return result(request, "indeterminate", "DESTINATION_SUBJECT_UNRESOLVED");
  }

  const adoption = await loadAdoptedDeclaration();
  if (!adoption.adopted || !adoption.handle) {
    return result(request, "failed", adoption.code, {
      evidenceRefs: [ADOPTED_DECLARATION_EVIDENCE_REF],
    });
  }

  const session = new CorpusSession(options.hostPort);
  try {
    await session.initialize();
  } catch {
    return result(request, "failed", "CORPUS_SESSION_INITIALIZATION_FAILED", {
      evidenceRefs: [ADOPTED_DECLARATION_EVIDENCE_REF],
    });
  }

  const runtime = new WarrantedCorpusSession(adoption.handle, session);
  const localRequest: TrustOperationRequest = {
    requestId: `world-encounter:${request.envelopeRef}`,
    trustId: adoption.handle.trustId,
    actorId: LOCAL_ACTOR_ID,
    capacity: LOCAL_CAPACITY,
    operation: "invoke-capability",
    targetScope: "capability",
    targetRef: request.destinationSubjectRef,
    capabilityId: LOCAL_CAPABILITY_ID,
    capabilityOperation: LOCAL_CAPABILITY_OPERATION,
  };

  const action = await runtime.act(localRequest, request.input);
  if (!action.admission.admitted || !action.admission.warrant) {
    return result(request, "refused", action.admission.code, {
      evidenceRefs: [ADOPTED_DECLARATION_EVIDENCE_REF],
    });
  }

  const execution = action.execution;
  if (!execution) {
    return result(request, "failed", "CORPUS_EXECUTION_RESULT_MISSING", {
      evidenceRefs: [ADOPTED_DECLARATION_EVIDENCE_REF],
    });
  }

  const launch = execution.launch;
  if (!launch || !launch.accepted) {
    return result(request, "failed", execution.code, {
      evidenceRefs: [ADOPTED_DECLARATION_EVIDENCE_REF],
    });
  }

  const receipt = launch.receipt;
  const evidenceRefs = [
    ADOPTED_DECLARATION_EVIDENCE_REF,
    ...receipt.evidenceRefs,
  ];

  if (!receipt.admitted || receipt.status === "refused") {
    return result(
      request,
      "refused",
      receipt.refusalCode ?? execution.code,
      {
        receiptRequestId: receipt.requestId,
        evidenceRefs,
      },
    );
  }

  if (receipt.status === "failed") {
    return result(
      request,
      "failed",
      receipt.failureCode ?? "CORPUS_HOST_FAILED",
      {
        receiptRequestId: receipt.requestId,
        evidenceRefs,
      },
    );
  }

  return result(request, "admitted", "CORPUS_ENCOUNTER_ADMITTED", {
    receiptRequestId: receipt.requestId,
    outputRefs: receipt.outputRefs,
    evidenceRefs,
  });
}
