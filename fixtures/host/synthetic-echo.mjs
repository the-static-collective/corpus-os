const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(Buffer.from(chunk));
}

const input = Buffer.concat(chunks).toString("utf8");
process.stdout.write(`echo:${input}`);
