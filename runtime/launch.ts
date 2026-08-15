import type { CorpusHostPort, HostFailureCode, HostObservation } from "../host/linux/host-port.js";
import type { CapabilityDescriptor } from "./capability-registry.js";
import { capabilityFixtureEvidenceRef } from "./capability-registry.js";

export type RefusalCode =
  | "CAPABILITY_NOT_FOUND"
  | "CAPABILITY_NON_AUTHORITY"
  | "CAPABILITY_OPERATION_NOT_ALLOWED";

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
  refusalCode?: RefusalCode;
  failureCode?: HostFailureCode;
}

function refusal(
  requestId: string,
  capabilityId: string,
  owner: string | null,
  operation: string,
  code: RefusalCode,
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
  };
}

export async function launchCapability(
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  hostPort: CorpusHostPort,
  requestId: string,
  capabilityId: string,
  operation: string,
  input: string,
): Promise<{ receipt: LaunchReceipt; output?: string }> {
  const capability = registry.get(capabilityId);
  if (!capability) {
    return { receipt: refusal(requestId, capabilityId, null, operation, "CAPABILITY_NOT_FOUND") };
  }

  if (capability.nonAuthority.includes(operation)) {
    return {
      receipt: refusal(
        requestId,
        capability.id,
        capability.owner,
        operation,
        "CAPABILITY_NON_AUTHORITY",
      ),
    };
  }

  if (!capability.allows.includes(operation)) {
    return {
      receipt: refusal(
        requestId,
        capability.id,
        capability.owner,
        operation,
        "CAPABILITY_OPERATION_NOT_ALLOWED",
      ),
    };
  }

  if (operation !== "echo") {
    return {
      receipt: refusal(
        requestId,
        capability.id,
        capability.owner,
        operation,
        "CAPABILITY_OPERATION_NOT_ALLOWED",
      ),
    };
  }

  const hostResult = await hostPort.execute({
    requestId,
    capabilityId: capability.id,
    operation,
    input,
  });

  if (hostResult.status === "failed") {
    return {
      receipt: {
        requestId,
        capabilityId: capability.id,
        owner: capability.owner,
        operation,
        admitted: true,
        status: "failed",
        failureCode: hostResult.failureCode,
        outputRefs: [],
        evidenceRefs: [capabilityFixtureEvidenceRef, "corpus-particular:ring_6"],
        hostObservation: hostResult.hostObservation,
      },
    };
  }

  return {
    output: hostResult.output,
    receipt: {
      requestId,
      capabilityId: capability.id,
      owner: capability.owner,
      operation,
      admitted: true,
      status: "completed",
      outputRefs: [`session-output:${requestId}`],
      evidenceRefs: [capabilityFixtureEvidenceRef, "corpus-particular:ring_6"],
      hostObservation: hostResult.hostObservation,
    },
  };
}
