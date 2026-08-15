import { loadAdoptedDeclaration } from "../runtime/adopted-declaration.js";
import { CorpusSession } from "../runtime/session.js";
import { WarrantedCorpusSession } from "../runtime/warranted-session.js";

const session = new CorpusSession();
await session.initialize();

const adoption = await loadAdoptedDeclaration();
if (!adoption.adopted || !adoption.handle) {
  throw new Error(`Unable to load adopted declaration: ${adoption.code}`);
}

const runtime = new WarrantedCorpusSession(adoption.handle, session);

const request = (overrides: Record<string, unknown> = {}) => ({
  requestId: "request:corpus-session-demo",
  trustId: adoption.handle!.trustId,
  actorId: "person:administrator",
  capacity: "administrator" as const,
  operation: "invoke-capability" as const,
  targetScope: "capability" as const,
  targetRef: "artifact:agreement-a",
  capabilityId: "synthetic.echo",
  capabilityOperation: "echo",
  ...overrides,
});

console.log("Corpus OS session\n");

console.log("1. open ring_6");
console.log(JSON.stringify(await session.open("ring_6"), null, 2));

console.log("\n2. capabilities");
console.log(JSON.stringify(session.capabilities(), null, 2));

console.log("\n3. adopted declaration cut");
console.log(JSON.stringify(adoption.handle, null, 2));

console.log("\n4. warranted synthetic.echo");
console.log(
  JSON.stringify(
    await runtime.act(request(), "hello corpus"),
    null,
    2,
  ),
);

console.log("\n5. attempt synthetic.canonicalize [expected Trust refusal]");
console.log(
  JSON.stringify(
    await runtime.act(
      request({
        requestId: "request:corpus-session-canonicalize",
        capabilityOperation: "canonicalize",
      }),
      "must not execute",
    ),
    null,
    2,
  ),
);
