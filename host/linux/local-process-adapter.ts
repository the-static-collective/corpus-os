import { spawn } from "node:child_process";
import { resolve } from "node:path";

import type {
  AdmittedHostExecution,
  CorpusHostPort,
  HostExecutionResult,
} from "./host-port.js";

const FIXED_ADAPTERS = new Map<string, string>([
  ["synthetic.echo:echo", "fixtures/host/synthetic-echo.mjs"],
  ["synthetic.fail:fail", "fixtures/host/synthetic-fail.mjs"],
]);

function failedStart(): HostExecutionResult {
  return {
    status: "failed",
    failureCode: "HOST_PROCESS_START_FAILED",
    hostObservation: {
      platform: process.platform,
      exitCode: null,
      signal: null,
    },
  };
}

export class LinuxLocalProcessHostPort implements CorpusHostPort {
  readonly host = "linux" as const;

  async execute(request: AdmittedHostExecution): Promise<HostExecutionResult> {
    const adapterPath = FIXED_ADAPTERS.get(
      `${request.capabilityId}:${request.operation}`,
    );
    if (!adapterPath) return failedStart();

    return new Promise((resolveResult) => {
      let child;
      try {
        child = spawn(process.execPath, [resolve(process.cwd(), adapterPath)], {
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        resolveResult(failedStart());
        return;
      }

      let settled = false;
      let stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.resume();

      child.once("error", () => {
        if (settled) return;
        settled = true;
        resolveResult(failedStart());
      });

      child.once("close", (exitCode, signal) => {
        if (settled) return;
        settled = true;

        const hostObservation = {
          platform: process.platform,
          exitCode,
          signal,
        };

        if (exitCode === 0) {
          resolveResult({
            status: "completed",
            output: stdout,
            hostObservation,
          });
          return;
        }

        resolveResult({
          status: "failed",
          failureCode: "HOST_PROCESS_EXIT_NONZERO",
          hostObservation,
        });
      });

      child.stdin.end(request.input, "utf8");
    });
  }
}
