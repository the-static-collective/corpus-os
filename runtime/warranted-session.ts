import type { TrustOperationRequest } from "../lib/trust-runtime.js";
import {
  admitActionWarrant,
  isIssuedActionWarrant,
  type ActionWarrantAdmission,
} from "./action-warrant.js";
import { isAdoptedDeclaration } from "./adopted-declaration.js";
import { CorpusSession } from "./session.js";

export type WarrantExecutionCode =
  | "ACTION_WARRANT_EXECUTED"
  | "ACTION_WARRANT_INVALID"
  | "ACTION_WARRANT_DECLARATION_NOT_ADOPTED"
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
    private readonly adoptedDeclaration: unknown,
    private readonly session: CorpusSession,
  ) {}

  admit(
    request: TrustOperationRequest,
    operationInput: string,
  ): ActionWarrantAdmission {
    return admitActionWarrant(this.adoptedDeclaration, request, operationInput);
  }

  async execute(warrant: unknown): Promise<WarrantExecutionResult> {
    if (!isAdoptedDeclaration(this.adoptedDeclaration)) {
      return {
        executed: false,
        code: "ACTION_WARRANT_DECLARATION_NOT_ADOPTED",
      };
    }

    if (!isIssuedActionWarrant(warrant)) {
      return {
        executed: false,
        code: "ACTION_WARRANT_INVALID",
      };
    }

    if (
      warrant.trustId !== this.adoptedDeclaration.trustId ||
      warrant.authorityCut !== this.adoptedDeclaration.authorityCut
    ) {
      return {
        executed: false,
        code: "ACTION_WARRANT_AUTHORITY_CUT_MISMATCH",
      };
    }

    const launch = await this.session.run(warrant);
    if (!launch.accepted) {
      return {
        executed: false,
        code:
          launch.code === "SESSION_WARRANT_ALREADY_CONSUMED"
            ? "ACTION_WARRANT_ALREADY_CONSUMED"
            : "ACTION_WARRANT_INVALID",
        launch,
      };
    }

    if (!launch.receipt.admitted) {
      if (launch.receipt.refusalCode === "CAPABILITY_NOT_FOUND") {
        return {
          executed: false,
          code: "ACTION_WARRANT_SESSION_CAPABILITY_NOT_FOUND",
          launch,
        };
      }
      if (launch.receipt.refusalCode === "CAPABILITY_OWNER_MISMATCH") {
        return {
          executed: false,
          code: "ACTION_WARRANT_CAPABILITY_OWNER_MISMATCH",
          launch,
        };
      }
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
