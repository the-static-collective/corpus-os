import {
  inspectActionWarrantState,
  isIssuedActionWarrant,
} from "./action-warrant.js";
import type { CapabilityDescriptor } from "./capability-registry.js";
import {
  evaluateCapabilityPolicy,
  type RefusalCode,
} from "./launch.js";
import type { WorldCut } from "./world-cut.js";

export type LatentReachabilityBlockCode =
  | "LATENT_WARRANT_INVALID"
  | "LATENT_WARRANT_SPENT"
  | "LATENT_BROKEN_LINEAGE"
  | "LATENT_SUBJECT_NOT_CONSTITUTED"
  | RefusalCode;

export type LatentReachability =
  | Readonly<{
      reachable: true;
      code: "ATTEMPT_REACHABLE";
      trustRequestId: string;
      subjectRef: string;
      capabilityId: string;
      capabilityOperation: string;
      outcome: "unknown-until-attempted";
      legalValidity: "unclaimed";
    }>
  | Readonly<{
      reachable: false;
      code: LatentReachabilityBlockCode;
      trustRequestId?: string;
      legalValidity: "unclaimed";
    }>;

function blocked(
  code: LatentReachabilityBlockCode,
  trustRequestId?: string,
): Readonly<LatentReachability> {
  if (trustRequestId === undefined) {
    return Object.freeze({
      reachable: false as const,
      code,
      legalValidity: "unclaimed" as const,
    });
  }

  return Object.freeze({
    reachable: false as const,
    code,
    trustRequestId,
    legalValidity: "unclaimed" as const,
  });
}

/**
 * Inspect whether one genuine issued Action Warrant is presently eligible to
 * cross the Session attempt boundary from a constituted WorldCut.
 *
 * This projection consumes no authority, invokes no host, predicts no outcome,
 * and cannot itself constitute a future state.
 */
export function inspectLatentReachability(
  worldCut: Readonly<WorldCut>,
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  warrant: unknown,
): Readonly<LatentReachability> {
  if (!isIssuedActionWarrant(warrant)) {
    return blocked("LATENT_WARRANT_INVALID");
  }

  if (inspectActionWarrantState(warrant) === "spent") {
    return blocked("LATENT_WARRANT_SPENT", warrant.trustRequestId);
  }

  if (
    warrant.trustId !== worldCut.root.trustId ||
    warrant.authorityCut !== worldCut.root.authorityCut
  ) {
    return blocked("LATENT_BROKEN_LINEAGE", warrant.trustRequestId);
  }

  if (!worldCut.constitutedRefs.includes(warrant.subjectRef)) {
    return blocked(
      "LATENT_SUBJECT_NOT_CONSTITUTED",
      warrant.trustRequestId,
    );
  }

  const policy = evaluateCapabilityPolicy(registry, warrant);
  if (!policy.admitted) {
    return blocked(policy.code, warrant.trustRequestId);
  }

  return Object.freeze({
    reachable: true as const,
    code: "ATTEMPT_REACHABLE" as const,
    trustRequestId: warrant.trustRequestId,
    subjectRef: warrant.subjectRef,
    capabilityId: warrant.capabilityId,
    capabilityOperation: warrant.capabilityOperation,
    outcome: "unknown-until-attempted" as const,
    legalValidity: "unclaimed" as const,
  });
}
