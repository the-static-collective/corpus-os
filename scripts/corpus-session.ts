import { CorpusSession } from "../runtime/session.js";

const session = new CorpusSession();
await session.initialize();

console.log("Corpus OS session\n");

console.log("1. open ring_6");
console.log(JSON.stringify(await session.open("ring_6"), null, 2));

console.log("\n2. capabilities");
console.log(JSON.stringify(session.capabilities(), null, 2));

console.log("\n3. run synthetic.echo");
console.log(JSON.stringify(session.run("synthetic.echo", "echo", "hello corpus"), null, 2));

console.log("\n4. attempt synthetic.canonicalize [expected refusal]");
console.log(JSON.stringify(session.run("synthetic.echo", "canonicalize"), null, 2));
