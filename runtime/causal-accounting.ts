import {
  inspectActionWarrantState,
  isIssuedActionWarrant,
  type ActionWarrant,
} from "./action-warrant.js";
import type { LaunchReceipt } from "./launch.js";

export type CausalDisposition =
  | "unspent"
  | "session-refused"
  | "host-failed"
  | "completed";

export type CausalAnomalyCode =
  | "ORPHAN_EFFECT"
  | "DOUBLE_SPEND"
  | "SUBSTITUTED_CONSEQUENCE"
  | "BROKEN_LINEAGE"
  | "MISSING_DISPOSITION";

export interface CausalAttemptEvidence {
  readonly warrant?: unknown;
  readonly receipt: LaunchReceipt;
}

export interface CausalEntry {
  readonly warrant: Readonly<ActionWarrant>;
  readonly disposition: CausalDisposition | null;
  readonly receipts: readonly LaunchReceipt[];
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCodes: readonly CausalAnomalyCode[];
}

export interface CausalReconciliation {
  readonly entries: readonly CausalEntry[];
  readonly orphanEffects: readonly LaunchReceipt[];
  readonly balanced: boolean;
}

export interface CausalReconciliationInput {
  readonly warrants: readonly unknown[];
  readonly attempts: readonly CausalAttemptEvidence[];
}

function terminalDisposition(receipt: LaunchReceipt): CausalDisposition | null {
  if (!receipt.admitted && receipt.status === "refused") {
    return "session-refused";
  }
  if (receipt.admitted && receipt.status === "failed") {
    return "host-failed";
  }
  if (receipt.admitted && receipt.status === "completed") {
    return "completed";
  }
  return null;
}

function hasBrokenLineage(
  warrant: Readonly<ActionWarrant>,
  receipt: LaunchReceipt,
): boolean {
  return (
    receipt.causalBinding.trustId !== warrant.trustId ||
    receipt.causalBinding.authorityCut !== warrant.authorityCut
  );
}

function hasSubstitutedConsequence(
  warrant: Readonly<ActionWarrant>,
  receipt: LaunchReceipt,
): boolean {
  const binding = receipt.causalBinding;
  if (
    binding.subjectRef !== warrant.subjectRef ||
    binding.capabilityId !== warrant.capabilityId ||
    binding.capabilityOperation !== warrant.capabilityOperation ||
    binding.capabilityOwner !== warrant.capabilityOwner ||
    binding.trustRequestId !== warrant.trustRequestId ||
    binding.operationInput !== warrant.operationInput
  ) {
    return true;
  }

  if (
    receipt.capabilityId !== warrant.capabilityId ||
    receipt.operation !== warrant.capabilityOperation
  ) {
    return true;
  }

  return receipt.admitted && receipt.owner !== warrant.capabilityOwner;
}

function pushUnique(
  values: CausalAnomalyCode[],
  code: CausalAnomalyCode,
): void {
  if (!values.includes(code)) values.push(code);
}

function freezeEntry(
  warrant: Readonly<ActionWarrant>,
  disposition: CausalDisposition | null,
  receipts: readonly LaunchReceipt[],
  anomalyCodes: readonly CausalAnomalyCode[],
): CausalEntry {
  const frozenReceipts = Object.freeze([...receipts]);
  const frozenAnomalyCodes = Object.freeze([...anomalyCodes]);
  return Object.freeze({
    warrant,
    disposition,
    receipts: frozenReceipts,
    balance: frozenAnomalyCodes.length === 0 ? "balanced" : "anomaly",
    anomalyCodes: frozenAnomalyCodes,
  });
}

export function reconcileCausalHistory(
  input: CausalReconciliationInput,
): CausalReconciliation {
  const warrants: Readonly<ActionWarrant>[] = [];
  const warrantSet = new Set<Readonly<ActionWarrant>>();

  for (const candidate of input.warrants) {
    if (!isIssuedActionWarrant(candidate) || warrantSet.has(candidate)) continue;
    warrantSet.add(candidate);
    warrants.push(candidate);
  }

  const attemptsByWarrant = new Map<
    Readonly<ActionWarrant>,
    LaunchReceipt[]
  >();
  const orphanEffects: LaunchReceipt[] = [];

  for (const attempt of input.attempts) {
    if (
      !isIssuedActionWarrant(attempt.warrant) ||
      !warrantSet.has(attempt.warrant)
    ) {
      orphanEffects.push(attempt.receipt);
      continue;
    }

    const receipts = attemptsByWarrant.get(attempt.warrant) ?? [];
    receipts.push(attempt.receipt);
    attemptsByWarrant.set(attempt.warrant, receipts);
  }

  const entries = warrants.map((warrant) => {
    const receipts = attemptsByWarrant.get(warrant) ?? [];
    const warrantState = inspectActionWarrantState(warrant);
    const anomalyCodes: CausalAnomalyCode[] = [];

    if (receipts.length === 0) {
      if (warrantState === "unspent") {
        return freezeEntry(warrant, "unspent", receipts, anomalyCodes);
      }

      pushUnique(anomalyCodes, "MISSING_DISPOSITION");
      return freezeEntry(warrant, null, receipts, anomalyCodes);
    }

    if (warrantState !== "spent") {
      pushUnique(anomalyCodes, "ORPHAN_EFFECT");
      orphanEffects.push(...receipts);
    }

    if (receipts.length > 1) {
      pushUnique(anomalyCodes, "DOUBLE_SPEND");
    }

    for (const receipt of receipts) {
      if (hasBrokenLineage(warrant, receipt)) {
        pushUnique(anomalyCodes, "BROKEN_LINEAGE");
      }
      if (hasSubstitutedConsequence(warrant, receipt)) {
        pushUnique(anomalyCodes, "SUBSTITUTED_CONSEQUENCE");
      }
      if (terminalDisposition(receipt) === null) {
        pushUnique(anomalyCodes, "SUBSTITUTED_CONSEQUENCE");
      }
    }

    const disposition = terminalDisposition(receipts[0]);
    return freezeEntry(warrant, disposition, receipts, anomalyCodes);
  });

  const frozenEntries = Object.freeze(entries);
  const frozenOrphanEffects = Object.freeze([...orphanEffects]);

  return Object.freeze({
    entries: frozenEntries,
    orphanEffects: frozenOrphanEffects,
    balanced:
      frozenOrphanEffects.length === 0 &&
      frozenEntries.every((entry) => entry.balance === "balanced"),
  });
}
