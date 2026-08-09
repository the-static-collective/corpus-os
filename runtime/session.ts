import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ring6Snapshot } from "../kernel/ring6.js";
import { sourceOccurrences, verifyTextSpan, type TextSpanSelector } from "../kernel/index.js";
import { loadCapabilityRegistry, type CapabilityDescriptor } from "./capability-registry.js";
import { launchCapability, type LaunchReceipt } from "./launch.js";

export interface OpenOccurrence {
  occurrenceId: string;
  artifactIdentity: string;
  sourcePath: string;
  exactSpanVerification: string;
  returnState: "resolved" | "bounded";
  unresolvedUpstream?: string;
}

export interface OpenParticularResult {
  particularId: "ring_6";
  occurrences: OpenOccurrence[];
}

export class CorpusSession {
  private requestSequence = 0;
  private readonly receipts: LaunchReceipt[] = [];
  private registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>> | null = null;

  async initialize(): Promise<void> {
    this.registry = await loadCapabilityRegistry();
  }

  private requireRegistry(): ReadonlyMap<string, Readonly<CapabilityDescriptor>> {
    if (!this.registry) throw new Error("Corpus session is not initialized.");
    return this.registry;
  }

  private nextRequestId(): string {
    this.requestSequence += 1;
    return `session-request-${String(this.requestSequence).padStart(4, "0")}`;
  }

  async open(particularId: string): Promise<OpenParticularResult> {
    if (particularId !== "ring_6") throw new Error(`Unknown particular: ${particularId}`);

    const occurrences = await Promise.all(sourceOccurrences(particularId, ring6Snapshot).map(async (occurrence) => {
      const artifactBytes = await readFile(resolve(process.cwd(), occurrence.sourcePath));
      const selector: TextSpanSelector = {
        artifactIdentity: occurrence.sourceHash as `sha256:${string}`,
        byteStart: occurrence.byteStart,
        byteEnd: occurrence.byteEnd,
        lineStart: occurrence.line,
        lineEnd: occurrence.line,
        selectedTextHash: occurrence.selectedTextHash as `sha256:${string}`,
      };
      const verification = verifyTextSpan(artifactBytes, selector);
      return {
        occurrenceId: occurrence.id,
        artifactIdentity: occurrence.sourceHash,
        sourcePath: occurrence.sourcePath,
        exactSpanVerification: verification.code,
        returnState: occurrence.verification === "verified" ? "resolved" as const : "bounded" as const,
        unresolvedUpstream: occurrence.verification === "verified" ? undefined : occurrence.citedOrigin,
      };
    }));

    return { particularId: "ring_6", occurrences };
  }

  capabilities(): Readonly<CapabilityDescriptor>[] {
    return [...this.requireRegistry().values()];
  }

  run(capabilityId: string, operation: string, input = ""): { receipt: LaunchReceipt; output?: string } {
    const result = launchCapability(
      this.requireRegistry(),
      this.nextRequestId(),
      capabilityId,
      operation,
      input,
    );
    this.receipts.push(result.receipt);
    return result;
  }

  recordedReceipts(): readonly LaunchReceipt[] {
    return this.receipts;
  }
}
