process.stdin.resume();
await new Promise((resolve) => process.stdin.once("end", resolve));
process.exitCode = 23;
