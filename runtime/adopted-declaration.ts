import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  validateTrustDeclaration,
  type CorpusTrustDeclaration,
} from "../lib/trust-runtime.js";

const ADOPTED_DECLARATION_URL = new URL(
  "../../fixtures/trusts/casework.synthetic.json",
  import.meta.url,
);

const EXPECTED_TRUST_ID = "trust:synthetic-casework-001";
const EXPECTED_AUTHORITY_CUT = "0.1";
const EXPECTED_RAW_SHA256 =
  "13ca707bad7ad089cce441de02270f8b7738fa4e8b1ca3cdf19420b8c6cf6a78";

const adoptedDeclarations = new WeakMap<
  object,
  Readonly<CorpusTrustDeclaration>
>();

export type AdoptedDeclarationCode =
  | "ADOPTED_DECLARATION_ADOPTED"
  | "ADOPTED_DECLARATION_BYTES_MISMATCH"
  | "ADOPTED_DECLARATION_ID_MISMATCH"
  | "ADOPTED_DECLARATION_CUT_MISMATCH"
  | "ADOPTED_DECLARATION_INVALID"
  | "ADOPTED_DECLARATION_PARSE_FAILED";

export interface AdoptedDeclaration {
  readonly kind: "corpus-adopted-declaration-v0.1";
  readonly trustId: string;
  readonly authorityCut: string;
  readonly rawSha256: string;
  readonly legalValidity: "unclaimed";
}

export interface AdoptionVerification {
  adopted: boolean;
  code: AdoptedDeclarationCode;
  rawSha256: string;
  legalValidity: "unclaimed";
  declaration?: Readonly<CorpusTrustDeclaration>;
}

export interface AdoptionResult extends AdoptionVerification {
  handle?: Readonly<AdoptedDeclaration>;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

function refusal(
  code: Exclude<AdoptedDeclarationCode, "ADOPTED_DECLARATION_ADOPTED">,
  rawSha256: string,
): AdoptionVerification {
  return {
    adopted: false,
    code,
    rawSha256,
    legalValidity: "unclaimed",
  };
}

export function verifyAdoptedDeclarationBytes(
  bytes: Uint8Array,
): AdoptionVerification {
  const rawSha256 = sha256(bytes);
  if (rawSha256 !== EXPECTED_RAW_SHA256) {
    return refusal("ADOPTED_DECLARATION_BYTES_MISMATCH", rawSha256);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return refusal("ADOPTED_DECLARATION_PARSE_FAILED", rawSha256);
  }

  const declaration = parsed as CorpusTrustDeclaration;
  if (declaration.id !== EXPECTED_TRUST_ID) {
    return refusal("ADOPTED_DECLARATION_ID_MISMATCH", rawSha256);
  }
  if (declaration.version !== EXPECTED_AUTHORITY_CUT) {
    return refusal("ADOPTED_DECLARATION_CUT_MISMATCH", rawSha256);
  }

  const validation = validateTrustDeclaration(declaration);
  if (!validation.valid) {
    return refusal("ADOPTED_DECLARATION_INVALID", rawSha256);
  }

  return {
    adopted: true,
    code: "ADOPTED_DECLARATION_ADOPTED",
    rawSha256,
    legalValidity: "unclaimed",
    declaration: deepFreeze(declaration),
  };
}

export async function loadAdoptedDeclaration(): Promise<AdoptionResult> {
  const bytes = await readFile(ADOPTED_DECLARATION_URL);
  const verification = verifyAdoptedDeclarationBytes(bytes);
  if (!verification.adopted || !verification.declaration) {
    return verification;
  }

  const handle = Object.freeze<AdoptedDeclaration>({
    kind: "corpus-adopted-declaration-v0.1",
    trustId: EXPECTED_TRUST_ID,
    authorityCut: EXPECTED_AUTHORITY_CUT,
    rawSha256: verification.rawSha256,
    legalValidity: "unclaimed",
  });

  adoptedDeclarations.set(handle, verification.declaration);

  return {
    ...verification,
    handle,
  };
}

export function isAdoptedDeclaration(
  value: unknown,
): value is Readonly<AdoptedDeclaration> {
  return (
    typeof value === "object" &&
    value !== null &&
    adoptedDeclarations.has(value)
  );
}

export function declarationForAdoptedHandle(
  value: unknown,
): Readonly<CorpusTrustDeclaration> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return adoptedDeclarations.get(value);
}
