import { isDeepStrictEqual } from "node:util";

import { CorpusSession } from "../runtime/session.js";

function print(label: string, value: unknown): void {
  console.log(`\n${label}`);
  console.log(JSON.stringify(value, null, 2));
}

const session = await CorpusSession.create();

console.log("Corpus OS session");

const opened = await session.open("ring_6");
print("1. open ring_6", opened);

const capabilities = session.capabilities();
print("2. capabilities", capabilities);

const completed = session.run("synthetic.echo", "echo", "hello corpus");
print("3. run synthetic.echo", completed);

const beforeRefusal = session.snapshotState();
const refused = session.run("synthetic.echo", "canonicalize", "hello corpus");
print("4. attempt synthetic.canonicalize [expected refusal]", refused);

const afterRefusal = session.snapshotState();
const preservationProof = {
  openedEvidenceUnchanged: isDeepStrictEqual(
    afterRefusal.openedParticular,
    beforeRefusal.openedParticular,
  ),
  capabilityDeclarationsUnchanged: isDeepStrictEqual(
    afterRefusal.capabilities,
    beforeRefusal.capabilities,
  ),
  priorReceiptsUnchanged: isDeepStrictEqual(
    afterRefusal.receipts.slice(0, beforeRefusal.receipts.length),
    beforeRefusal.receipts,
  ),
  onlyRefusalReceiptAppended:
    afterRefusal.receipts.length === beforeRefusal.receipts.length + 1 &&
    afterRefusal.receipts.at(-1)?.status === "refused",
};

print("state preservation proof", preservationProof);

if (!Object.values(preservationProof).every(Boolean)) {
  process.exitCode = 1;
}
