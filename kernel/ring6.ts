import {
  branches,
  lineage,
  occurrences,
  tensions,
} from "../lib/ring6-fixture.js";

import type { CorpusSnapshot } from "./index.js";

export const ring6Snapshot: CorpusSnapshot = {
  particularId: "ring_6",
  occurrences,
  lineage,
  branches,
  tensions,
};
