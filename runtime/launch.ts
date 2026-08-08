import type { CapabilityDescriptor } from "./capability-registry.js";

export type RefusalCode =
  | "CAPABILITY_NOT_FOUND"
  | "CAPABILITY_NON_AUTHORITY"
  | "CAPABILITY_OPERATION_NOT_ALLOWED";

export interface CapabilityRequest {
  requestId: string;
  capabilityId: string;
  operation: string;
  input: string;
  evidenceRefs: readonly string[];
}

interface ReceiptBase {
  requestId: string;
  capabilityId: string;
  owner: string | null;
  operation: string;
  evidenceRefs: readonly string[];
  outputRefs: readonly string[];
  hostObservation: {
    platform: NodeJS.Platform;
  };
}

export interface CompletedLaunchReceipt extends ReceiptBase {
  admitted: true;
  status: "completed";
  output: string;
}

export interface RefusedLaunchReceipt extends ReceiptBase {
  admitted: false;
  status: "refused";
  refusalCode: RefusalCode;
}

export type LaunchReceipt = CompletedLaunchReceipt | RefusedLaunchReceipt;

function refusal(
  request: CapabilityRequest,
  owner: string | null,
  refusalCode: RefusalCode,
): RefusedLaunchReceipt {
  return Object.freeze({
    requestId: request.requestId,
    capabilityId: request.capabilityId,
    owner,
    operation: request.operation,
    admitted: false,
    status: "refused",
    refusalCode,
    outputRefs: Object.freeze([]),
    evidenceRefs: Object.freeze([...request.evidenceRefs]),
    hostObservation: Object.freeze({ platform: process.platform }),
  });
}

export function launchCapability(
  capability: CapabilityDescriptor | undefined,
  request: CapabilityRequest,
): LaunchReceipt {
  if (!capability) {
    return refusal(request, null, "CAPABILITY_NOT_FOUND");
  }

  if (capability.nonAuthority.includes(request.operation)) {
    return refusal(request, capability.owner, "CAPABILITY_NON_AUTHORITY");
  }

  if (!capability.allows.includes(request.operation)) {
    return refusal(request, capability.owner, "CAPABILITY_OPERATION_NOT_ALLOWED");
  }

  if (request.operation !== "echo") {
    return refusal(request, capability.owner, "CAPABILITY_OPERATION_NOT_ALLOWED");
  }

  return Object.freeze({
    requestId: request.requestId,
    capabilityId: capability.id,
    owner: capability.owner,
    operation: request.operation,
    admitted: true,
    status: "completed",
    output: request.input,
    outputRefs: Object.freeze([`session-output:${request.requestId}`]),
    evidenceRefs: Object.freeze([...request.evidenceRefs]),
    hostObservation: Object.freeze({ platform: process.platform }),
  });
}
