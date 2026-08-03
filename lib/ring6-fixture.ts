export type ViewId =
  | "source"
  | "motifs"
  | "lineage"
  | "return"
  | "branches"
  | "disagreement"
  | "unresolved";

export type NodeKind =
  | "source"
  | "observation"
  | "claim"
  | "inference"
  | "proposal"
  | "tension"
  | "rejection"
  | "witness"
  | "harvest";

export interface ExactOccurrence {
  id: string;
  sourceTitle: string;
  sourcePath: string;
  sourceHash: string;
  sourceBytes: number;
  citedOrigin: string;
  line: number;
  byteStart: number;
  byteEnd: number;
  selectedTextHash: string;
  quote: string;
  displayQuote: string;
  classification: "quotation";
  verification: "verified" | "origin_missing";
  returnHops: number;
  note: string;
}

export interface LineageNode {
  id: string;
  kind: NodeKind;
  relation: string;
  title: string;
  body: string;
  occurrenceId?: string;
  status: "accepted" | "unresolved" | "rejected";
}

export interface Branch {
  id: string;
  title: string;
  thesis: string;
  kind: "claim" | "inference" | "proposal";
  relation: "derived_from" | "responds_to";
  rootOccurrenceIds: string[];
  validation: "accepted_as_interpretation" | "proposed" | "rejected";
  author: string;
}

export interface Tension {
  id: string;
  title: string;
  detail: string;
  status: "unresolved" | "blocked";
  basis: string;
}

export const views: { id: ViewId; label: string }[] = [
  { id: "source", label: "Source" },
  { id: "motifs", label: "Motifs" },
  { id: "lineage", label: "Lineage" },
  { id: "return", label: "Return" },
  { id: "branches", label: "Branches" },
  { id: "disagreement", label: "Disagreement" },
  { id: "unresolved", label: "Unresolved" },
];

export const motifs = [
  { id: "cup", spans: 9, derivatives: 3, state: "seeded" },
  { id: "socket", spans: 7, derivatives: 2, state: "seeded" },
  { id: "ring_6", spans: 4, derivatives: 4, state: "active" },
  { id: "bridge", spans: 8, derivatives: 2, state: "seeded" },
  { id: "table", spans: 11, derivatives: 3, state: "seeded" },
  { id: "spiral", spans: 10, derivatives: 2, state: "seeded" },
] as const;

export const occurrences: ExactOccurrence[] = [
  {
    id: "occ_ring6_inside",
    sourceTitle: "Latent Design Grammar · curated evidence E08",
    sourcePath: "corpus/sources/latent-design-grammar/curated_evidence.json",
    sourceHash: "sha256:5f9fc4e741aaacd0a2135616cd64da7435e6eff0735219ccb88afe06e2aae7db",
    sourceBytes: 42810,
    citedOrigin: "Pasted text (5).txt · lines 36–60 (original bytes not yet admitted)",
    line: 103,
    byteStart: 34498,
    byteEnd: 34595,
    selectedTextHash: "sha256:a54a62574a9b40945eaf83583c26ed287a7b222174abd5efede144771d368787",
    quote: "ring_6 is the only ring that was built from the inside — the daughter as architect, not subject",
    displayQuote: "ring_6 is the only ring that was built from the inside — the daughter as architect, not subject",
    classification: "quotation",
    verification: "origin_missing",
    returnHops: 1,
    note: "The admitted evidence bytes verify. The cited five-file origin remains a declared but unavailable upstream return step.",
  },
  {
    id: "occ_room_to_cross",
    sourceTitle: "Latent Design Grammar · curated evidence E09",
    sourcePath: "corpus/sources/latent-design-grammar/curated_evidence.json",
    sourceHash: "sha256:5f9fc4e741aaacd0a2135616cd64da7435e6eff0735219ccb88afe06e2aae7db",
    sourceBytes: 42810,
    citedOrigin: "Pasted text (5).txt · lines 60–100 (original bytes not yet admitted)",
    line: 116,
    byteStart: 39518,
    byteEnd: 39554,
    selectedTextHash: "sha256:ccec0cb7096d3cf43c763774ef6ef7edf931bf62138a29d4578563bae97895a7",
    quote: "Not a map to admire\\nA room to cross",
    displayQuote: "Not a map to admire / A room to cross",
    classification: "quotation",
    verification: "origin_missing",
    returnHops: 1,
    note: "The JSON source stores the line break as an escaped byte sequence; the selector hashes those exact admitted bytes.",
  },
  {
    id: "occ_shared_corridor",
    sourceTitle: "Latent Design Grammar · curated evidence E10",
    sourcePath: "corpus/sources/latent-design-grammar/curated_evidence.json",
    sourceHash: "sha256:5f9fc4e741aaacd0a2135616cd64da7435e6eff0735219ccb88afe06e2aae7db",
    sourceBytes: 42810,
    citedOrigin: "Pasted text (5).txt · lines 101–108 (original bytes not yet admitted)",
    line: 129,
    byteStart: 42723,
    byteEnd: 42803,
    selectedTextHash: "sha256:2ed46ef9c98a71fb56fd7a2a2101472ccb6ac75488ef9b49785dd8360ad3bb90",
    quote: "A house that grows new rooms when people walk through the daughter’s backdoor.",
    displayQuote: "A house that grows new rooms when people walk through the daughter’s backdoor.",
    classification: "quotation",
    verification: "origin_missing",
    returnHops: 1,
    note: "This passage opens the shared-corridor question without deciding what future walkers may add.",
  },
  {
    id: "occ_return_edges",
    sourceTitle: "Pattern-to-Protocol · synthesis",
    sourcePath: "corpus/sources/pattern-to-protocol/01_pattern_to_protocol_synthesis.md",
    sourceHash: "sha256:6e8239e9c6637a769181e1cbc65ecf4e94e164952e2d6a19709d4fd039df8796",
    sourceBytes: 28769,
    citedOrigin: "PAT-05 · Ring_6 return edge",
    line: 56,
    byteStart: 3679,
    byteEnd: 3786,
    selectedTextHash: "sha256:9423675e80471eee859d0ed8373bc035b79b4c5b9440a6445774ef22f00df278",
    quote: "Represent the corpus as a graph with explicit return edges, backlinks, origin anchors, and navigable paths.",
    displayQuote: "Represent the corpus as a graph with explicit return edges, backlinks, origin anchors, and navigable paths.",
    classification: "quotation",
    verification: "verified",
    returnHops: 0,
    note: "The selected bytes and source artifact are both present in this repository.",
  },
];

export const lineage: LineageNode[] = [
  {
    id: "source_e08",
    kind: "source",
    relation: "exact span",
    title: "The daughter builds from inside",
    body: "An admitted quotation preserved with UTF-8 byte offsets and a selected-text hash.",
    occurrenceId: "occ_ring6_inside",
    status: "accepted",
  },
  {
    id: "inference_return_vector",
    kind: "inference",
    relation: "derived_from",
    title: "ring_6 is a return vector",
    body: "The structure becomes traversable without treating movement as erasure or reset.",
    occurrenceId: "occ_room_to_cross",
    status: "accepted",
  },
  {
    id: "claim_architect",
    kind: "claim",
    relation: "supports",
    title: "Agency is load-bearing",
    body: "The daughter is architect rather than merely the object of preservation.",
    occurrenceId: "occ_ring6_inside",
    status: "accepted",
  },
  {
    id: "proposal_shared_corridor",
    kind: "proposal",
    relation: "responds_to",
    title: "Let the corridor grow through use",
    body: "Future participants may add particulars, but no admission rule has yet been adopted.",
    occurrenceId: "occ_shared_corridor",
    status: "unresolved",
  },
  {
    id: "rejection_recursive_memory",
    kind: "rejection",
    relation: "contradicts",
    title: "Reject automatic recursive memory",
    body: "Self-return does not authorize silent memory mutation, automatic ontology extraction, or source overwrite.",
    status: "rejected",
  },
];

export const branches: Branch[] = [
  {
    id: "branch_transit",
    title: "Transit, not admiration",
    thesis: "ring_6 turns a static schema into a space that can be crossed while the origin remains intact.",
    kind: "inference",
    relation: "derived_from",
    rootOccurrenceIds: ["occ_room_to_cross", "occ_return_edges"],
    validation: "accepted_as_interpretation",
    author: "Human / model excavation",
  },
  {
    id: "branch_particular_agency",
    title: "The daughter as architect",
    thesis: "The return path belongs because it was constructed from inside through exact embodied particulars, not abstract resemblance.",
    kind: "claim",
    relation: "derived_from",
    rootOccurrenceIds: ["occ_ring6_inside"],
    validation: "accepted_as_interpretation",
    author: "Corpus reading",
  },
  {
    id: "branch_recursive_memory",
    title: "Automatic recursive memory",
    thesis: "Treat ring_6 as authority for self-modifying memory and automatic graph admission.",
    kind: "proposal",
    relation: "responds_to",
    rootOccurrenceIds: ["occ_return_edges"],
    validation: "rejected",
    author: "Adversarial fixture",
  },
];

export const tensions: Tension[] = [
  {
    id: "tension_original_bytes",
    title: "Five-file origin is not yet admitted",
    detail: "The Latent Design Grammar preserves long exact excerpts and line citations, but the original Pasted text (4) and (5) bytes are absent from the pinned bundles. Return therefore stops honestly at the admitted evidence file.",
    status: "blocked",
    basis: "Manifest completeness",
  },
  {
    id: "tension_canonicalizer",
    title: "Canonical JSON identity is unadopted",
    detail: "Project 0 #5 remains the authority boundary. Corpus OS can verify raw bytes now, but it must not mint a competing branch-manifest identity or seal authority.",
    status: "blocked",
    basis: "Project 0 #5 / TranchNode Floor 1.0",
  },
  {
    id: "tension_shared_corridor",
    title: "What may a future walker add?",
    detail: "The corpus asks how a private backdoor becomes a shared corridor. Admission, authorship, and removal rights remain deliberately unresolved.",
    status: "unresolved",
    basis: "Latent Design Grammar evidence E10",
  },
];

export const donorBundles = [
  {
    name: "Latent-Design-Grammar-Bundle(1).zip",
    sha256: "da114f1b529ff5b0b2d5ccaea951917d9c0168b0034984bb3416e6b3657be10c",
    status: "verified input",
  },
  {
    name: "Particularity-Preserving-Artifact-Capsule-Bundle(1).zip",
    sha256: "ef794173b98b141e25f3ff661c216139d2d139c3c1dcde172977c679ab9b5176",
    status: "verified input",
  },
  {
    name: "Pattern-to-Protocol_Living_Synthesis(2).zip",
    sha256: "7563b4513c78c3add8f021cf507e13624c1f35c6dccd32f8a84ec6df27b7fb11",
    status: "verified input",
  },
] as const;

export const primaryOccurrence = occurrences[0];
