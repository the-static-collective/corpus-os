import type {
  CausalAnomalyCode,
  CausalDisposition,
  CausalReconciliation,
} from "./causal-accounting.js";

export type TerminalDisposition = Exclude<CausalDisposition, "unspent">;

export interface ReachabilityCause {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly actorId: string | null;
  readonly capacity: string | null;
  readonly subjectRef: string;
  readonly capabilityId: string;
  readonly capabilityOperation: string;
  readonly trustRequestId: string;
}

export interface ReachabilityCausalRecord {
  readonly cause: ReachabilityCause;
  readonly disposition: CausalDisposition | null;
  readonly consequence?: { readonly outputRefs: readonly string[] };
  readonly balance: "balanced" | "anomaly";
  readonly anomalyCodes: readonly CausalAnomalyCode[];
}

export interface ConstitutedRoot {
  readonly trustId: string;
  readonly authorityCut: string;
  readonly constitutedRefs: readonly string[];
}

export interface TerminalHistoryEntry {
  readonly cause: ReachabilityCause;
  readonly disposition: TerminalDisposition;
  readonly outputRefs: readonly string[];
}

export interface OrphanObservation {
  readonly ref: string;
  readonly classification: "ORPHAN_OBSERVATION";
}

export interface ReachabilityIssue {
  readonly classification: "UNRESOLVED";
  readonly anomalyCode?: CausalAnomalyCode;
  readonly trustRequestId?: string;
}

export interface WorldCut {
  readonly root: Readonly<Pick<ConstitutedRoot, "trustId" | "authorityCut">>;
  readonly constitutedRefs: readonly string[];
  readonly terminalHistory: readonly TerminalHistoryEntry[];
  readonly unresolved: readonly ReachabilityIssue[];
  readonly orphanObservations: readonly OrphanObservation[];
  readonly legalValidity: "unclaimed";
}

export interface DeriveWorldCutInput {
  readonly root: ConstitutedRoot;
  readonly causalRecords: readonly ReachabilityCausalRecord[];
  readonly observations: readonly string[];
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNullableStrings(
  left: string | null,
  right: string | null,
): number {
  return compareStrings(left ?? "", right ?? "");
}

function compareCauses(left: ReachabilityCause, right: ReachabilityCause): number {
  const scalarComparisons = [
    compareStrings(left.trustRequestId, right.trustRequestId),
    compareStrings(left.trustId, right.trustId),
    compareStrings(left.authorityCut, right.authorityCut),
    compareNullableStrings(left.actorId, right.actorId),
    compareNullableStrings(left.capacity, right.capacity),
    compareStrings(left.subjectRef, right.subjectRef),
    compareStrings(left.capabilityId, right.capabilityId),
    compareStrings(left.capabilityOperation, right.capabilityOperation),
  ];

  return scalarComparisons.find((comparison) => comparison !== 0) ?? 0;
}

function terminalDisposition(
  value: CausalDisposition | null,
): value is TerminalDisposition {
  return (
    value === "session-refused" ||
    value === "host-failed" ||
    value === "completed"
  );
}

function freezeCause(cause: ReachabilityCause): ReachabilityCause {
  return Object.freeze({ ...cause });
}

function unresolvedIssue(
  trustRequestId: string,
  anomalyCode?: CausalAnomalyCode,
): ReachabilityIssue {
  return Object.freeze(
    anomalyCode === undefined
      ? {
          classification: "UNRESOLVED" as const,
          trustRequestId,
        }
      : {
          classification: "UNRESOLVED" as const,
          anomalyCode,
          trustRequestId,
        },
  );
}

/**
 * Copy the minimum non-authoritative evidence needed by Lawful Reachability
 * out of the richer Causal Accounting reconciliation shape. No warrant or
 * terminal receipt object crosses this boundary. Effects with no genuine
 * warrant attribution retain explicit null actor/capacity fields rather than
 * inventing authority metadata that Causal Accounting does not possess.
 */
export function reachabilityRecordsFromReconciliation(
  reconciliation: CausalReconciliation,
): readonly ReachabilityCausalRecord[] {
  const records: ReachabilityCausalRecord[] = [];

  for (const entry of reconciliation.entries) {
    const cause = freezeCause({
      trustId: entry.warrant.trustId,
      authorityCut: entry.warrant.authorityCut,
      actorId: entry.warrant.actorId,
      capacity: entry.warrant.capacity,
      subjectRef: entry.warrant.subjectRef,
      capabilityId: entry.warrant.capabilityId,
      capabilityOperation: entry.warrant.capabilityOperation,
      trustRequestId: entry.warrant.trustRequestId,
    });
    const anomalyCodes = uniqueSorted(entry.anomalyCodes) as readonly CausalAnomalyCode[];
    const consequence =
      entry.disposition === "completed"
        ? Object.freeze({
            outputRefs: uniqueSorted(
              entry.receipts.flatMap((receipt) => receipt.outputRefs),
            ),
          })
        : undefined;

    records.push(
      Object.freeze({
        cause,
        disposition: entry.disposition,
        ...(consequence === undefined ? {} : { consequence }),
        balance: entry.balance,
        anomalyCodes,
      }),
    );
  }

  for (const orphanEffect of reconciliation.orphanEffects) {
    records.push(
      Object.freeze({
        cause: freezeCause({
          trustId: orphanEffect.causalBinding.trustId,
          authorityCut: orphanEffect.causalBinding.authorityCut,
          actorId: null,
          capacity: null,
          subjectRef: orphanEffect.causalBinding.subjectRef,
          capabilityId: orphanEffect.causalBinding.capabilityId,
          capabilityOperation: orphanEffect.causalBinding.capabilityOperation,
          trustRequestId: orphanEffect.causalBinding.trustRequestId,
        }),
        disposition: null,
        balance: "anomaly" as const,
        anomalyCodes: Object.freeze(["ORPHAN_EFFECT" as const]),
      }),
    );
  }

  records.sort(
    (left, right) =>
      compareCauses(left.cause, right.cause) ||
      compareStrings(left.disposition ?? "", right.disposition ?? "") ||
      compareStrings(left.anomalyCodes.join("\u0000"), right.anomalyCodes.join("\u0000")),
  );

  return Object.freeze(records);
}

export function deriveWorldCut(input: DeriveWorldCutInput): Readonly<WorldCut> {
  const constituted = new Set(input.root.constitutedRefs);
  const terminalHistory: TerminalHistoryEntry[] = [];
  const unresolved: ReachabilityIssue[] = [];
  const unresolvedKeys = new Set<string>();

  const addUnresolved = (
    trustRequestId: string,
    anomalyCode?: CausalAnomalyCode,
  ): void => {
    const key = `${trustRequestId}\u0000${anomalyCode ?? ""}`;
    if (unresolvedKeys.has(key)) return;
    unresolvedKeys.add(key);
    unresolved.push(unresolvedIssue(trustRequestId, anomalyCode));
  };

  for (const record of input.causalRecords) {
    const lineageMatches =
      record.cause.trustId === input.root.trustId &&
      record.cause.authorityCut === input.root.authorityCut;
    const anomalyCodes = new Set<CausalAnomalyCode>(record.anomalyCodes);

    if (!lineageMatches) anomalyCodes.add("BROKEN_LINEAGE");

    if (
      !lineageMatches ||
      record.balance !== "balanced" ||
      record.disposition === null
    ) {
      const sortedCodes = [...anomalyCodes].sort();
      if (sortedCodes.length === 0) {
        addUnresolved(record.cause.trustRequestId);
      } else {
        for (const anomalyCode of sortedCodes) {
          addUnresolved(record.cause.trustRequestId, anomalyCode);
        }
      }
      continue;
    }

    if (!terminalDisposition(record.disposition)) continue;

    const outputRefs =
      record.disposition === "completed"
        ? uniqueSorted(record.consequence?.outputRefs ?? [])
        : Object.freeze([] as string[]);

    terminalHistory.push(
      Object.freeze({
        cause: freezeCause(record.cause),
        disposition: record.disposition,
        outputRefs,
      }),
    );

    if (record.disposition === "completed") {
      for (const ref of outputRefs) constituted.add(ref);
    }
  }

  terminalHistory.sort(
    (left, right) =>
      compareCauses(left.cause, right.cause) ||
      compareStrings(left.disposition, right.disposition) ||
      compareStrings(left.outputRefs.join("\u0000"), right.outputRefs.join("\u0000")),
  );
  unresolved.sort(
    (left, right) =>
      compareStrings(left.trustRequestId ?? "", right.trustRequestId ?? "") ||
      compareStrings(left.anomalyCode ?? "", right.anomalyCode ?? ""),
  );

  const orphanObservations = uniqueSorted(input.observations)
    .filter((ref) => !constituted.has(ref))
    .map((ref) =>
      Object.freeze({
        ref,
        classification: "ORPHAN_OBSERVATION" as const,
      }),
    );

  return Object.freeze({
    root: Object.freeze({
      trustId: input.root.trustId,
      authorityCut: input.root.authorityCut,
    }),
    constitutedRefs: uniqueSorted(constituted),
    terminalHistory: Object.freeze(terminalHistory),
    unresolved: Object.freeze(unresolved),
    orphanObservations: Object.freeze(orphanObservations),
    legalValidity: "unclaimed",
  });
}
