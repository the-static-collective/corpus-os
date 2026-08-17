import {
  WORLD_ENCOUNTER_REQUEST_SCHEMA,
  evaluateWorldEncounterAdmission,
  refuseCallerAuthorityAttempt,
  type WorldEncounterAdmissionRequest,
  type WorldEncounterAdmissionResult,
} from "../runtime/world-encounter-admission.js";

const RESPONSE_SCHEMA = "corpus-os/world-encounter-stdio-response/v0.1";
const MAX_INPUT_BYTES = 1_048_576;
const MAX_OPERATION_INPUT_CHARS = 16_384;
const MAX_SUBJECT_REF_CHARS = 512;
const ENCOUNTER_REF = /^enc-[0-9a-f]{64}$/;
const AUTHORITY_FIELDS = new Set([
  "actorId",
  "authority",
  "capacity",
  "capabilityId",
  "capabilityOperation",
  "trustId",
  "warrant",
]);
const ALLOWED_FIELDS = new Set([
  "schema",
  "envelopeRef",
  "destinationFrameRef",
  "profile",
  "destinationSubjectRef",
  "input",
]);

type AdapterResponse =
  | {
      schema: typeof RESPONSE_SCHEMA;
      ok: true;
      result: WorldEncounterAdmissionResult;
    }
  | {
      schema: typeof RESPONSE_SCHEMA;
      ok: false;
      error: { code: string };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function write(response: AdapterResponse): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function fail(code: string): never {
  write({ schema: RESPONSE_SCHEMA, ok: false, error: { code } });
  process.exit(1);
}

async function readStdin(): Promise<string> {
  let input = "";
  let bytes = 0;
  let tooLarge = false;
  process.stdin.setEncoding("utf8");

  for await (const chunk of process.stdin) {
    bytes += Buffer.byteLength(chunk, "utf8");
    if (bytes > MAX_INPUT_BYTES) {
      tooLarge = true;
      continue;
    }
    input += chunk;
  }

  if (tooLarge) fail("ADAPTER_INPUT_TOO_LARGE");
  return input;
}

function requireString(
  value: unknown,
  code: string,
  maxChars?: number,
): string {
  if (typeof value !== "string" || value.length === 0) fail(code);
  if (maxChars !== undefined && value.length > maxChars) fail(code);
  return value;
}

function baseRequest(parsed: Record<string, unknown>): WorldEncounterAdmissionRequest {
  const envelopeRef = requireString(parsed.envelopeRef, "ADAPTER_INVALID_ENVELOPE_REF");
  if (!ENCOUNTER_REF.test(envelopeRef)) fail("ADAPTER_INVALID_ENVELOPE_REF");

  const destinationFrameRef = requireString(
    parsed.destinationFrameRef,
    "ADAPTER_INVALID_DESTINATION_FRAME",
    512,
  );
  const profile = requireString(parsed.profile, "ADAPTER_INVALID_PROFILE", 512);
  const input = requireString(
    parsed.input,
    "ADAPTER_INVALID_OPERATION_INPUT",
    MAX_OPERATION_INPUT_CHARS,
  );

  let destinationSubjectRef: string | undefined;
  if (parsed.destinationSubjectRef !== undefined) {
    destinationSubjectRef = requireString(
      parsed.destinationSubjectRef,
      "ADAPTER_INVALID_DESTINATION_SUBJECT",
      MAX_SUBJECT_REF_CHARS,
    );
  }

  return {
    schema: WORLD_ENCOUNTER_REQUEST_SCHEMA,
    envelopeRef,
    destinationFrameRef,
    profile,
    destinationSubjectRef,
    input,
  };
}

async function main(): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readStdin());
  } catch {
    fail("ADAPTER_MALFORMED_JSON");
  }

  if (!isRecord(parsed)) fail("ADAPTER_INVALID_REQUEST");
  if (parsed.schema !== WORLD_ENCOUNTER_REQUEST_SCHEMA) {
    fail("ADAPTER_UNSUPPORTED_SCHEMA_VERSION");
  }

  const request = baseRequest(parsed);

  for (const key of Object.keys(parsed)) {
    if (AUTHORITY_FIELDS.has(key)) {
      write({
        schema: RESPONSE_SCHEMA,
        ok: true,
        result: refuseCallerAuthorityAttempt(request),
      });
      return;
    }
  }

  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_FIELDS.has(key)) fail("ADAPTER_UNKNOWN_FIELD");
  }

  const result = await evaluateWorldEncounterAdmission(request);
  write({ schema: RESPONSE_SCHEMA, ok: true, result });
}

await main().catch(() => fail("ADAPTER_INTERNAL_FAILURE"));
