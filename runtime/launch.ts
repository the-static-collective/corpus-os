import type {
  CorpusHostPort,
  HostFailureCode,
  HostObservation,
} from "../host/linux/host-port.js";
import {
  consumeIssuedActionWarrant,
  type ActionWarrant,
} from "./action-warrant.js";
import type { CapabilityDescriptor } from "./capability-registry.js";
import { capabilityFixtureEvidenceRef } from "./capability-registry.js";

export type RefusalCode =
  | "CAPABILITY_NOT_FOUND"
  | "CAPABILITY_OWNER_MISMATCH"
  | "CAPABILITY_NON_AUTHORITY"
  | "CAPABILITY_OPERATION_NOT_ALLOWED";

export interface LaunchCausalBinding {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly subjectRef: string;
  readonly capabilityId: string;
  readonly capabilityOperation: string;
  readonly capabilityOwner: string;
  readonly trustRequestId: string;
  readonly operationInput: string;
}

export interface LaunchReceipt {
  requestId: string;
  capabilityId: string;
  owner: string | null;
  operation: string;
  admitted: boolean;
  status: "completed" | "refused" | "failed";
  outputRefs: string[];
  evidenceRefs: string[];
  hostObservation: HostObservation;
  causalBinding: LaunchCausalBinding;
  refusalCode?: RefusalCode;
  failureCode?: HostFailureCode;
}

export type SessionWarrantCode =
  | "SESSION_WARRANT_ACCEPTED"
  | "SESSION_WARRANT_INVALID"
  | "SESSION_WARRANT_ALREADY_CONSUMED";

export type WarrantedLaunchResult =
  | {
      accepted: false;
      code: "SESSION_WARRANT_INVALID" | "SESSION_WARRANT_ALREADY_CONSUMED";
    }
  | {
      accepted: true;
      code: "SESSION_WARRANT_ACCEPTED";
      receipt: LaunchReceipt;
      output?: string;
    };

function bindingForWarrant(
  warrant: Readonly<ActionWarrant>,
): LaunchCausalBinding {
  return {
    trustId: warrant.trustId,
    authorityCut: warrant.authorityCut,
    subjectRef: warrant.subjectRef,
    capabilityId: warrant.capabilityId,
    capabilityOperation: warrant.capabilityOperation,
    capabilityOwner: warrant.capabilityOwner,
    trustRequestId: warrant.trustRequestId,
    operationInput: warrant.operationInput,
  };
}

function refusal(
  requestId: string,
  capabilityId: string,
  owner: string | null,
  operation: string,
  code: RefusalCode,
  causalBinding: LaunchCausalBinding,
): LaunchReceipt {
  return {
    requestId,
    capabilityId,
    owner,
    operation,
    admitted: false,
    status: "refused",
    refusalCode: code,
    outputRefs: [],
    evidenceRefs: [capabilityFixtureEvidenceRef],
    hostObservation: { platform: process.platform },
    causalBinding,
  };
}

export interface CapabilityAdmission {
  capability?: Readonly<CapabilityDescriptor>;
  refusal?: LaunchReceipt;
}

export function evaluateCapabilityAdmission(
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  requestId: string,
  warrant: Readonly<ActionWarrant>,
): CapabilityAdmission {
  const causalBinding = bindingForWarrant(warrant);
  const capability = registry.get(warrant.capabilityId);
  if (!capability) {
    return {
      refusal: refusal(
        requestId,
        warrant.capabilityId,
        null,
        warrant.capabilityOperation,
        "CAPABILITY_NOT_FOUND",
        causalBinding,
      ),
    };
  }

  if (capability.owner !== warrant.capabilityOwner) {
    return {
      refusal: refusal(
        requestId,
        capability.id,
        capability.owner,
        warrant.capabilityOperation,
        "CAPABILITY_OWNER_MISMATCH",
        causalBinding,
      ),
    };
  }

  if (capability.nonAuthority.includes(warrant.capabilityOperation)) {
    return {
      refusal: refusal(
        requestId,
        capability.id,
        capability.owner,
        warrant.capabilityOperation,
        "CAPABILITY_NON_AUTHORITY",
        causalBinding,
      ),
    };
  }

  if (!capability.allows.includes(warrant.capabilityOperation)) {
    return {
      refusal: refusal(
        requestId,
        capability.id,
        capability.owner,
        warrant.capabilityOperation,
        "CAPABILITY_OPERATION_NOT_ALLOWED",
        causalBinding,
      ),
    };
  }

  if (warrant.capabilityOperation !== "echo") {
    return {
      refusal: refusal(
        requestId,
        capability.id,
        capability.owner,
        warrant.capabilityOperation,
        "CAPABILITY_OPERATION_NOT_ALLOWED",
        causalBinding,
      ),
    };
  }

  return { capability };
}

export async function launchCapability(
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  hostPort: CorpusHostPort,
  nextRequestId: () => string,
  warrant: unknown,
): Promise<WarrantedLaunchResult> {
  const consumption = consumeIssuedActionWarrant(warrant);
  if (consumption.status === "invalid") {
    return {
      accepted: false,
      code: "SESSION_WARRANT_INVALID",
    };
  }
  if (consumption.status === "already-consumed") {
    return {
      accepted: false,
      code: "SESSION_WARRANT_ALREADY_CONSUMED",
    };
  }

  const causalBinding = bindingForWarrant(consumption.warrant);
  const requestId = nextRequestId();
  const admitted = evaluateCapabilityAdmission(
    registry,
    requestId,
    consumption.warrant,
  );
  if (admitted.refusal) {
    return {
      accepted: true,
      code: "SESSION_WARRANT_ACCEPTED",
      receipt: admitted.refusal,
    };
  }

  const capability = admitted.capability;
  if (!capability) {
    throw new Error("Capability admission produced neither capability nor refusal.");
  }

  const hostResult = await hostPort.execute({
    requestId,
    capabilityId: capability.id,
    operation: consumption.warrant.capabilityOperation,
    input: consumption.warrant.operationInput,
  });

  if (hostResult.status === "failed") {
    return {
      accepted: true,
      code: "SESSION_WARRANT_ACCEPTED",
      receipt: {
        requestId,
        capabilityId: capability.id,
        owner: capability.owner,
        operation: consumption.warrant.capabilityOperation,
        admitted: true,
        status: "failed",
        failureCode: hostResult.failureCode,
        outputRefs: [],
        evidenceRefs: [capabilityFixtureEvidenceRef, "corpus-particular:ring_6"],
        hostObservation: hostResult.hostObservation,
        causalBinding,
      },
    };
  }

  return {
    accepted: true,
    code: "SESSION_WARRANT_ACCEPTED",
    output: hostResult.output,
    receipt: {
      requestId,
      capabilityId: capability.id,
      owner: capability.owner,
      operation: consumption.warrant.capabilityOperation,
      admitted: true,
      status: "completed",
      outputRefs: [`session-output:${requestId}`],
      evidenceRefs: [capabilityFixtureEvidenceRef, "corpus-particular:ring_6"],
      hostObservation: hostResult.hostObservation,
      causalBinding,
    },
  };
}
