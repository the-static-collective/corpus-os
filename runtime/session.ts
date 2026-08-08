import { readFile } from "node:fs/promises";

import {
  returnRoutes,
  sourceOccurrences,
  verifyTextSpan,
  type ReturnRoute,
  type TextSpanSelector,
} from "../kernel/index.js";
import { ring6Snapshot } from "../kernel/ring6.js";
import {
  findCapability,
  loadCapabilityRegistry,
  type CapabilityDescriptor,
} from "./capability-registry.js";
import {
  launchCapability,
  type LaunchReceipt,
} from "./launch.js";

export interface SessionOccurrenceView {
  occurrenceId: string;
  artifactIdentity: string;
  sourcePath: string;
  selector: {
    byteStart: number;
    byteEnd: number;
    selectedTextHash: string;
  };
  exactSpanVerification: string;
  return: {
    status: ReturnRoute["status"];
    hops: number;
    sourcePath: string;
    unresolvedUpstream?: string;
  } | null;
}

export interface OpenParticularView {
  particularId: string;
  occurrences: SessionOccurrenceView[];
}

export interface SessionStateSnapshot {
  openedParticular: OpenParticularView | null;
  capabilities: CapabilityDescriptor[];
  receipts: LaunchReceipt[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function routeForOccurrence(occurrenceId: string): ReturnRoute | undefined {
  for (const node of ring6Snapshot.lineage) {
    if (node.occurrenceId !== occurrenceId) continue;
    const route = returnRoutes(node.id, ring6Snapshot).find(
      (candidate) => candidate.occurrenceId === occurrenceId,
    );
    if (route) return route;
  }

  for (const branch of ring6Snapshot.branches) {
    if (!branch.rootOccurrenceIds.includes(occurrenceId)) continue;
    const route = returnRoutes(branch.id, ring6Snapshot).find(
      (candidate) => candidate.occurrenceId === occurrenceId,
    );
    if (route) return route;
  }

  return undefined;
}

async function openRing6(): Promise<OpenParticularView> {
  const sourceCache = new Map<string, Uint8Array>();
  const occurrences = sourceOccurrences("ring_6", ring6Snapshot);
  const views: SessionOccurrenceView[] = [];

  for (const occurrence of occurrences) {
    let sourceBytes = sourceCache.get(occurrence.sourcePath);
    if (!sourceBytes) {
      const sourceUrl = new URL(`../../${occurrence.sourcePath}`, import.meta.url);
      sourceBytes = await readFile(sourceUrl);
      sourceCache.set(occurrence.sourcePath, sourceBytes);
    }

    const selector: TextSpanSelector = {
      artifactIdentity: occurrence.sourceHash as `sha256:${string}`,
      byteStart: occurrence.byteStart,
      byteEnd: occurrence.byteEnd,
      lineStart: occurrence.line,
      lineEnd: occurrence.line,
      selectedTextHash: occurrence.selectedTextHash as `sha256:${string}`,
    };
    const verification = verifyTextSpan(sourceBytes, selector);
    const route = routeForOccurrence(occurrence.id);

    views.push({
      occurrenceId: occurrence.id,
      artifactIdentity: occurrence.sourceHash,
      sourcePath: occurrence.sourcePath,
      selector: {
        byteStart: occurrence.byteStart,
        byteEnd: occurrence.byteEnd,
        selectedTextHash: occurrence.selectedTextHash,
      },
      exactSpanVerification: verification.code,
      return: route
        ? {
            status: route.status,
            hops: route.hops,
            sourcePath: route.sourcePath,
            unresolvedUpstream: route.unresolvedUpstream,
          }
        : null,
    });
  }

  return {
    particularId: ring6Snapshot.particularId,
    occurrences: views,
  };
}

export class CorpusSession {
  private readonly registry: readonly CapabilityDescriptor[];
  private openedParticular: OpenParticularView | null = null;
  private receiptLog: readonly LaunchReceipt[] = [];
  private requestSequence = 0;

  private constructor(registry: readonly CapabilityDescriptor[]) {
    this.registry = registry;
  }

  static async create(): Promise<CorpusSession> {
    return new CorpusSession(await loadCapabilityRegistry());
  }

  async open(particularId: string): Promise<OpenParticularView> {
    if (particularId !== "ring_6") {
      throw new Error(`Unknown particular: ${particularId}`);
    }

    const opened = await openRing6();
    this.openedParticular = clone(opened);
    return clone(opened);
  }

  capabilities(): CapabilityDescriptor[] {
    return clone([...this.registry]);
  }

  receipts(): LaunchReceipt[] {
    return clone([...this.receiptLog]);
  }

  run(capabilityId: string, operation: string, input: string): LaunchReceipt {
    this.requestSequence += 1;
    const requestId = `session-request:${String(this.requestSequence).padStart(4, "0")}`;
    const capability = findCapability(this.registry, capabilityId);
    const evidenceRefs = this.openedParticular?.occurrences.map(
      (occurrence) => occurrence.occurrenceId,
    ) ?? [];

    const receipt = launchCapability(capability, {
      requestId,
      capabilityId,
      operation,
      input,
      evidenceRefs,
    });
    this.receiptLog = Object.freeze([...this.receiptLog, receipt]);
    return clone(receipt);
  }

  snapshotState(): SessionStateSnapshot {
    return clone({
      openedParticular: this.openedParticular,
      capabilities: [...this.registry],
      receipts: [...this.receiptLog],
    });
  }
}
