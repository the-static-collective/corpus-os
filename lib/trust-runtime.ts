export type TrustCapacity =
  | "constitutor"
  | "administrator"
  | "beneficiary"
  | "reviewer"
  | "delegate";

export type TrustTargetScope = "corpus" | "derived" | "declaration" | "capability";

export type TrustOperation =
  | "inspect"
  | "append-derived"
  | "challenge"
  | "invoke-capability"
  | "amend-declaration"
  | "remove-source"
  | "declare-fact";

export interface TrustParticipant {
  id: string;
  capacities: TrustCapacity[];
}

export interface TrustPower {
  capacity: TrustCapacity;
  operation: TrustOperation;
  targetScope: TrustTargetScope;
  capabilityId?: string;
}

export interface TrustCapabilityDescriptor {
  id: string;
  owner: string;
  allows: string[];
  nonAuthority: string[];
}

export interface CorpusTrustDeclaration {
  id: string;
  version: string;
  kind: "corpus-trust-declaration";
  legalValidity: "unclaimed";
  purpose: string;
  corpusRefs: string[];
  participants: TrustParticipant[];
  powers: TrustPower[];
  capabilities: TrustCapabilityDescriptor[];
  forbiddenOperations: TrustOperation[];
}

export interface TrustOperationRequest {
  requestId: string;
  trustId: string;
  actorId: string;
  capacity: TrustCapacity;
  operation: TrustOperation;
  targetScope: TrustTargetScope;
  targetRef?: string;
  capabilityId?: string;
  capabilityOperation?: string;
}

export type TrustDecisionCode =
  | "TRUST_OPERATION_ADMITTED"
  | "TRUST_ID_MISMATCH"
  | "TRUST_ACTOR_NOT_DECLARED"
  | "TRUST_CAPACITY_NOT_DECLARED"
  | "TRUST_OPERATION_FORBIDDEN"
  | "TRUST_POWER_NOT_GRANTED"
  | "TRUST_TARGET_NOT_IN_CORPUS"
  | "TRUST_CAPABILITY_NOT_DECLARED"
  | "TRUST_CAPABILITY_NON_AUTHORITY"
  | "TRUST_CAPABILITY_OPERATION_NOT_ALLOWED";

export interface TrustOperationReceipt {
  requestId: string;
  trustId: string;
  actorId: string;
  capacity: TrustCapacity;
  operation: TrustOperation;
  admitted: boolean;
  code: TrustDecisionCode;
  targetRef?: string;
  capabilityId?: string;
  capabilityOwner?: string;
  capabilityOperation?: string;
  legalValidity: "unclaimed";
}

export interface TrustDeclarationValidation {
  valid: boolean;
  errors: string[];
}

export function validateTrustDeclaration(
  declaration: CorpusTrustDeclaration,
): TrustDeclarationValidation {
  const errors: string[] = [];

  if (declaration.legalValidity !== "unclaimed") {
    errors.push("Corpus Trust Runtime must not claim legal validity.");
  }

  if (!declaration.id.trim()) errors.push("Trust id is required.");
  if (!declaration.purpose.trim()) errors.push("Trust purpose is required.");

  const participantIds = new Set<string>();
  for (const participant of declaration.participants) {
    if (participantIds.has(participant.id)) {
      errors.push(`Duplicate participant id: ${participant.id}`);
    }
    participantIds.add(participant.id);
    if (participant.capacities.length === 0) {
      errors.push(`Participant has no declared capacity: ${participant.id}`);
    }
  }

  const capabilityIds = new Set<string>();
  for (const capability of declaration.capabilities) {
    if (capabilityIds.has(capability.id)) {
      errors.push(`Duplicate capability id: ${capability.id}`);
    }
    capabilityIds.add(capability.id);

    const overlap = capability.allows.filter((operation) =>
      capability.nonAuthority.includes(operation),
    );
    if (overlap.length > 0) {
      errors.push(
        `Capability ${capability.id} both allows and disclaims authority for: ${overlap.join(", ")}`,
      );
    }
  }

  for (const power of declaration.powers) {
    if (declaration.forbiddenOperations.includes(power.operation)) {
      errors.push(
        `Power ${power.capacity}:${power.operation} contradicts forbiddenOperations.`,
      );
    }
    if (power.capabilityId && !capabilityIds.has(power.capabilityId)) {
      errors.push(`Power references unknown capability: ${power.capabilityId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function receipt(
  request: TrustOperationRequest,
  admitted: boolean,
  code: TrustDecisionCode,
  capability?: TrustCapabilityDescriptor,
): TrustOperationReceipt {
  return {
    requestId: request.requestId,
    trustId: request.trustId,
    actorId: request.actorId,
    capacity: request.capacity,
    operation: request.operation,
    admitted,
    code,
    targetRef: request.targetRef,
    capabilityId: request.capabilityId,
    capabilityOwner: capability?.owner,
    capabilityOperation: request.capabilityOperation,
    legalValidity: "unclaimed",
  };
}

export function evaluateTrustOperation(
  declaration: CorpusTrustDeclaration,
  request: TrustOperationRequest,
): TrustOperationReceipt {
  if (request.trustId !== declaration.id) {
    return receipt(request, false, "TRUST_ID_MISMATCH");
  }

  const participant = declaration.participants.find(
    (candidate) => candidate.id === request.actorId,
  );
  if (!participant) {
    return receipt(request, false, "TRUST_ACTOR_NOT_DECLARED");
  }

  if (!participant.capacities.includes(request.capacity)) {
    return receipt(request, false, "TRUST_CAPACITY_NOT_DECLARED");
  }

  if (declaration.forbiddenOperations.includes(request.operation)) {
    return receipt(request, false, "TRUST_OPERATION_FORBIDDEN");
  }

  const power = declaration.powers.find(
    (candidate) =>
      candidate.capacity === request.capacity &&
      candidate.operation === request.operation &&
      candidate.targetScope === request.targetScope &&
      (!candidate.capabilityId || candidate.capabilityId === request.capabilityId),
  );

  if (!power) {
    return receipt(request, false, "TRUST_POWER_NOT_GRANTED");
  }

  if (
    request.targetScope === "corpus" &&
    request.targetRef &&
    !declaration.corpusRefs.includes(request.targetRef)
  ) {
    return receipt(request, false, "TRUST_TARGET_NOT_IN_CORPUS");
  }

  if (request.operation !== "invoke-capability") {
    return receipt(request, true, "TRUST_OPERATION_ADMITTED");
  }

  const capability = declaration.capabilities.find(
    (candidate) => candidate.id === request.capabilityId,
  );
  if (!capability) {
    return receipt(request, false, "TRUST_CAPABILITY_NOT_DECLARED");
  }

  if (
    request.capabilityOperation &&
    capability.nonAuthority.includes(request.capabilityOperation)
  ) {
    return receipt(
      request,
      false,
      "TRUST_CAPABILITY_NON_AUTHORITY",
      capability,
    );
  }

  if (
    !request.capabilityOperation ||
    !capability.allows.includes(request.capabilityOperation)
  ) {
    return receipt(
      request,
      false,
      "TRUST_CAPABILITY_OPERATION_NOT_ALLOWED",
      capability,
    );
  }

  return receipt(request, true, "TRUST_OPERATION_ADMITTED", capability);
}
