import { readFile } from "node:fs/promises";

export interface CapabilityDescriptor {
  id: string;
  owner: string;
  authority: "execution";
  transport: "local-process";
  allows: readonly string[];
  nonAuthority: readonly string[];
}

const syntheticCapabilityUrl = new URL(
  "../../fixtures/capabilities/synthetic.echo.json",
  import.meta.url,
);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateCapabilityDescriptor(value: unknown): CapabilityDescriptor {
  if (typeof value !== "object" || value === null) {
    throw new Error("Synthetic capability fixture must be an object.");
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.owner !== "string" ||
    candidate.authority !== "execution" ||
    candidate.transport !== "local-process" ||
    !isStringArray(candidate.allows) ||
    !isStringArray(candidate.nonAuthority)
  ) {
    throw new Error("Synthetic capability fixture is invalid.");
  }

  return Object.freeze({
    id: candidate.id,
    owner: candidate.owner,
    authority: candidate.authority,
    transport: candidate.transport,
    allows: Object.freeze([...candidate.allows]),
    nonAuthority: Object.freeze([...candidate.nonAuthority]),
  });
}

export async function loadCapabilityRegistry(): Promise<readonly CapabilityDescriptor[]> {
  const bytes = await readFile(syntheticCapabilityUrl, "utf8");
  const parsed: unknown = JSON.parse(bytes);
  return Object.freeze([validateCapabilityDescriptor(parsed)]);
}

export function findCapability(
  registry: readonly CapabilityDescriptor[],
  capabilityId: string,
): CapabilityDescriptor | undefined {
  return registry.find((capability) => capability.id === capabilityId);
}
