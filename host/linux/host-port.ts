export type HostFailureCode =
  | "HOST_PROCESS_START_FAILED"
  | "HOST_PROCESS_EXIT_NONZERO";

export interface AdmittedHostExecution {
  requestId: string;
  capabilityId: string;
  operation: string;
  input: string;
}

export interface HostObservation {
  platform: NodeJS.Platform;
  exitCode?: number | null;
  signal?: string | null;
}

export type HostExecutionResult =
  | {
      status: "completed";
      output: string;
      hostObservation: HostObservation;
    }
  | {
      status: "failed";
      failureCode: HostFailureCode;
      hostObservation: HostObservation;
    };

export interface CorpusHostPort {
  readonly host: "linux";
  execute(request: AdmittedHostExecution): Promise<HostExecutionResult>;
}
