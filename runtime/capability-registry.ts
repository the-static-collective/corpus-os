import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface CapabilityDescriptor {
  id: string;
  owner: string;
  authority: "execution";
  transport: "local-process";
  allows: string[];
  nonAuthority: string[];
}

const FIXTURE_PATH = "fixtures/capabilities/synthetic.echo.json";

export async function loadCapabilityRegistry(): Promise<ReadonlyMap<string, Readonly<CapabilityDescriptor>>> {
  const raw = await readFile(resolve(process.cwd(), FIXTURE_PATH), "utf8");
  const parsed = JSON.parse(raw) as CapabilityDescriptor;

  if (
    parsed.id !== "synthetic.echo" ||
    parsed.owner !== "fixture.synthetic-runtime" ||
    parsed.authority !== "execution" ||
    parsed.transport !== "local-process" ||
    !Array.isArray(parsed.allows) ||
    !Array.isArray(parsed.nonAuthority)
  ) {
    throw new Error("Invalid synthetic capability fixture.");
  }

  return new Map([[parsed.id, Object.freeze({
    ...parsed,
    allows: Object.freeze([...parsed.allows]) as unknown as string[],
    nonAuthority: Object.freeze([...parsed.nonAuthority]) as unknown as string[],
  })]]);
}

export const capabilityFixtureEvidenceRef = FIXTURE_PATH;
