import {
  evaluateTrustOperation,
  type TrustCapacity,
  type TrustDecisionCode,
  type TrustOperationReceipt,
  type TrustOperationRequest,
} from "../lib/trust-runtime.js";
import {
  declarationForAdoptedHandle,
  isAdoptedDeclaration,
} from "./adopted-declaration.js";

const issuedWarrants = new WeakSet<object>();

export interface ActionWarrant {
  readonly kind: "corpus-action-warrant-v0.1";
  readonly trustId: string;
  readonly authorityCut: string;
  readonly actorId: string;
  readonly capacity: TrustCapacity;
  readonly purpose: string;
  readonly subjectRef: string;
  readonly capabilityId: string;
  readonly capabilityOperation: string;
  readonly capabilityOwner: string;
  readonly trustRequestId: string;
  readonly operationInput: string;
  readonly legalValidity: "unclaimed";
}

export type ActionWarrantAdmissionCode =
  | TrustDecisionCode
  | "ACTION_WARRANT_DECLARATION_NOT_ADOPTED"
  | "ACTION_WARRANT_OPERATION_REQUIRED"
  | "ACTION_WARRANT_TARGET_REQUIRED"
  | "ACTION_WARRANT_TARGET_NOT_IN_CORPUS"
  | "ACTION_WARRANT_INCOMPLETE"
  | "ACTION_WARRANT_ADMITTED";

export interface ActionWarrantAdmission {
  admitted: boolean;
  code: ActionWarrantAdmissionCode;
  trustReceipt?: TrustOperationReceipt;
  warrant?: Readonly<ActionWarrant>;
}

export function admitActionWarrant(
  adoptedDeclaration: unknown,
  request: TrustOperationRequest,
  operationInput: string,
): ActionWarrantAdmission {
  if (!isAdoptedDeclaration(adoptedDeclaration)) {
    return {
      admitted: false,
      code: "ACTION_WARRANT_DECLARATION_NOT_ADOPTED",
    };
  }

  const declaration = declarationForAdoptedHandle(adoptedDeclaration);
  if (!declaration) {
    return {
      admitted: false,
      code: "ACTION_WARRANT_DECLARATION_NOT_ADOPTED",
    };
  }

  const trustReceipt = evaluateTrustOperation(declaration, request);
  if (!trustReceipt.admitted) {
    return {
      admitted: false,
      code: trustReceipt.code,
      trustReceipt,
    };
  }

  if (request.operation !== "invoke-capability") {
    return {
      admitted: false,
      code: "ACTION_WARRANT_OPERATION_REQUIRED",
      trustReceipt,
    };
  }

  if (!request.targetRef) {
    return {
      admitted: false,
      code: "ACTION_WARRANT_TARGET_REQUIRED",
      trustReceipt,
    };
  }

  if (!declaration.corpusRefs.includes(request.targetRef)) {
    return {
      admitted: false,
      code: "ACTION_WARRANT_TARGET_NOT_IN_CORPUS",
      trustReceipt,
    };
  }

  if (
    !request.capabilityId ||
    !request.capabilityOperation ||
    !trustReceipt.capabilityOwner
  ) {
    return {
      admitted: false,
      code: "ACTION_WARRANT_INCOMPLETE",
      trustReceipt,
    };
  }

  const warrant = Object.freeze<ActionWarrant>({
    kind: "corpus-action-warrant-v0.1",
    trustId: declaration.id,
    authorityCut: declaration.version,
    actorId: request.actorId,
    capacity: request.capacity,
    purpose: declaration.purpose,
    subjectRef: request.targetRef,
    capabilityId: request.capabilityId,
    capabilityOperation: request.capabilityOperation,
    capabilityOwner: trustReceipt.capabilityOwner,
    trustRequestId: request.requestId,
    operationInput,
    legalValidity: "unclaimed",
  });

  issuedWarrants.add(warrant);

  return {
    admitted: true,
    code: "ACTION_WARRANT_ADMITTED",
    trustReceipt,
    warrant,
  };
}

export function isIssuedActionWarrant(
  value: unknown,
): value is Readonly<ActionWarrant> {
  return typeof value === "object" && value !== null && issuedWarrants.has(value);
}
