import {
  runWorldEncounterDestination,
  type CorpusWorldEncounterRequest,
} from "../kernel/world-encounter-destination.js";

const MAX_STDIN_BYTES = 1_048_576;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > MAX_STDIN_BYTES) {
      throw new Error("CORPUS_WORLD_ENCOUNTER_INPUT_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function writeTransportFailure(code: string): void {
  process.stdout.write(`${JSON.stringify({
    schema: "corpus.world-encounter-process-error/v0.1",
    status: "error",
    code,
  })}\n`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readStdin());
  } catch (error: unknown) {
    const code = error instanceof Error && error.message === "CORPUS_WORLD_ENCOUNTER_INPUT_TOO_LARGE"
      ? error.message
      : "CORPUS_WORLD_ENCOUNTER_INVALID_JSON";
    writeTransportFailure(code);
    return;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    writeTransportFailure("CORPUS_WORLD_ENCOUNTER_INVALID_REQUEST");
    return;
  }

  const schema = (parsed as { schema?: unknown }).schema;
  if (schema !== "corpus.world-encounter-destination/v0.1") {
    writeTransportFailure("CORPUS_WORLD_ENCOUNTER_UNSUPPORTED_SCHEMA");
    return;
  }

  const result = runWorldEncounterDestination(parsed as CorpusWorldEncounterRequest);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch(() => {
  writeTransportFailure("CORPUS_WORLD_ENCOUNTER_PROCESS_FAILURE");
});
