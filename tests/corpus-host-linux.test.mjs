import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { LinuxLocalProcessHostPort } from "../.kernel-dist/host/linux/local-process-adapter.js";

test("fixed adapter location is independent of caller working directory", async () => {
  const originalCwd = process.cwd();
  const foreignCwd = await mkdtemp(join(tmpdir(), "corpus-host-cwd-"));

  try {
    process.chdir(foreignCwd);
    const result = await new LinuxLocalProcessHostPort().execute({
      requestId: "host-cwd-0001",
      capabilityId: "synthetic.echo",
      operation: "echo",
      input: "cwd stays data",
    });

    assert.equal(result.status, "completed");
    assert.equal(result.output, "echo:cwd stays data");
    assert.equal(result.hostObservation.exitCode, 0);
  } finally {
    process.chdir(originalCwd);
    await rm(foreignCwd, { recursive: true, force: true });
  }
});
