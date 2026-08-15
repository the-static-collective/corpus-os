import type {
  CorpusTrustDeclaration,
  TrustOperationRequest,
} from "../lib/trust-runtime.js";
import {
  admitActionWarrant,
  isIssuedActionWarrant,
  type ActionWarrantAdmission,
} from "./action-warrant.js";
import { CorpusSession } from "./session.js";

const consumedWarrants = new WeakSet<object>();

export type WarrantExecutionCode =
  | "ACTION_WARRANT_EXECUTED"
  | "ACTION_WARRANT_INVALID"
  | "ACTION_WARRANT_AUTHORITY_CUT_MISMATCH"
  | "ACTION_WARRANT_ALREADY_CONSUMED"
  | "ACTION_WARRANT_SESSION_CAPABILITY_NOT_FOUND"
  | "ACTION_WARRANT_CAPABILITY_OWNER_MISMATCH"
  | "ACTION_WARRANT_SESSION_REFUSED";

export interface WarrantExecutionResult {
  executed: boolean;
  code: WarrantExecutionCode;
  launch?: Awaited<ReturnType<CorpusSession["run"]>>;
}

export interface WarrantedActionResult {
  admission: ActionWarrantAdmission;
  execution?: WarrantExecutionResult;
}

export class WarrantedCorpusSession {
  constructor(
    private readonly declaration: CorpusTrustDeclaration,
    private readonly session: CorpusSession,
  ) {}

  admit(
    request: TrustOperationRequest,
    operationInput: string,
  ): ActionWarrantAdmission {
    return admitActionWarrant(this.declaration, request, operationInput);
  }

  async execute(warrant: unknown): Promise<WarrantExecutionResult> {
    if (!isIssuedActionWarrant(warrant)) {
      return {
        executed: false,
        code: "ACTION_WARRANT_INVALID",
      };
    }

    if (
      warrant.trustId !== this.declaration.id ||
      warrant.authorityCut !== this.declaration.version
    ) {
      return {
        executed: false,
        code: "ACTION_WARRANT_AUTHORITY_CUT_MISMATCH",
      };
    }

    if (consumedWarrants.has(warrant)) {
      return {
        executed: false,
        code: "ACTION_WARRANT_ALREADY_CONSUMED",
      };
    }

    const sessionCapability = this.session
      .capabilities()
      .find((capability) => capability.id === warrant.capabilityId);
    if (!sessionCapability) {
      return {
        executed: false,
        code: "ACTION_WARRANT_SESSION_CAPABILITY_NOT_FOUND",
      };
    }

    if (sessionCapability.owner !== warrant.capabilityOwner) {
      return {
        executed: false,
        code: "ACTION_WARRANT_CAPABILITY_OWNER_MISMATCH",
      };
    }

    // A warrant becomes spent at the point it crosses into Session admission.
    // Session refusal or host failure must not make the same authority replayable.
    consumedWarrants.add(warrant);

    const launch = await this.session.run(
      warrant.capabilityId,
      warrant.capabilityOperation,
      warrant.operationInput,
    );

    if (!launch.receipt.admitted) {
      return {
        executed: false,
        code: "ACTION_WARRANT_SESSION_REFUSED",
        launch,
      };
    }

    return {
      executed: true,
      code: "ACTION_WARRANT_EXECUTED",
      launch,
    };
  }

  async act(
    request: TrustOperationRequest,
    operationInput: string,
  ): Promise<WarrantedActionResult> {
    const admission = this.admit(request, operationInput);
    if (!admission.admitted || !admission.warrant) {
      return { admission };
    }

    return {
      admission,
      execution: await this.execute(admission.warrant),
    };
  }
}
