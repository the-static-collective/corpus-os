# RBTS testable invariants

This file converts the latent design grammar into acceptance criteria.

## Artifact integrity

- [ ] A committed artifact's content hash is verified on every read used for transformation.
- [ ] Editing a committed artifact creates a new artifact; the prior artifact remains byte-identical.
- [ ] A correction uses `CORRECTS` or `SUPERSEDES`; it does not silently replace history.
- [ ] Derived summaries and embeddings can be deleted and rebuilt from canonical evidence.

## Provenance and return

- [ ] Every committed non-root artifact names at least one parent.
- [ ] Every parent edge points through a typed transformation event.
- [ ] Every committed derivative has at least one verified path to raw source evidence.
- [ ] A broken or redacted path is reported as such; the system never fabricates continuity.
- [ ] A user can branch from any authorized prior artifact without changing the original branch.

## Anchors and particularity

- [ ] Every anchor resolves to exact text, bytes, or media time range.
- [ ] A model interpretation of an anchor is stored separately from the anchor itself.
- [ ] A required anchor omitted from a transformation that claims fidelity causes validation failure or an explicit waiver.
- [ ] Human-designated anchors cannot be replaced by automatic extraction without a human decision event.
- [ ] Private anchors remain excluded from provider requests unless policy explicitly allows them.

## Asymmetric roles

- [ ] Generation, validation, archival, and human approval are separate event types.
- [ ] A generator cannot mark its own output canonical without a policy-recorded validation/approval path.
- [ ] A validator emits reasons and evidence, not only a scalar score.
- [ ] The archivist verifies hashes and lineage before commit.
- [ ] When one service performs multiple roles, each role action remains independently auditable.

## Resumable sessions

- [ ] Logical session ID is independent of transport/socket ID.
- [ ] Commands have idempotency keys.
- [ ] Client and server maintain monotonic sequence numbers.
- [ ] Reconnect resumes from the last acknowledged event.
- [ ] Replaying the same command produces one committed effect.
- [ ] Queues are bounded or durable; overflow is explicit and observable.
- [ ] Retry uses capped exponential backoff with jitter, not symbolic timing constants.
- [ ] Reconciliation handles server restarts and stale client state.

## Cross-modal bridge

- [ ] Every provider job is represented as a durable event.
- [ ] Inputs, provider/version, parameters, and output hashes are recorded.
- [ ] Partial provider outputs are stored with explicit partial status.
- [ ] A text span can be traced to the lyric artifact and from there to audio/transcription time ranges where alignment exists.
- [ ] Provider replacement does not change internal artifact and job contracts.
- [ ] Cross-modal translation is labeled lossy unless fidelity is directly verified.

## Controlled extension — the thirteenth test

- [ ] Unknown artifact kinds are preserved as raw evidence.
- [ ] Unknown kinds cannot execute or bypass validation.
- [ ] Unknown kinds enter quarantine with a reviewable schema proposal.
- [ ] Known workflows continue operating when an unknown kind is present.
- [ ] Extension adoption requires schema versioning, migration, rollback, and policy review.

## Retention, deletion, and Jubilee

- [ ] Users can export their project as a reproducible bundle.
- [ ] Deletion policy distinguishes canonical content, derived views, caches, and audit metadata.
- [ ] Tombstones preserve graph integrity without exposing deleted content.
- [ ] Sensitive anchors can be redacted while the return path reports partial redaction.
- [ ] Compaction never promotes a summary into the only remaining evidence without explicit policy.

## Falsification scenarios

1. Kill the orchestrator after provider submission and before local acknowledgment. On restart, the system must discover the existing provider job and avoid duplicate submission.
2. Corrupt one source file byte. Every dependent return path must report integrity failure.
3. Ask two agents to summarize the same source. Both outputs must share the same root evidence while retaining independent transformation events.
4. Delete one branch. Other branches and their parent lineage must remain intact.
5. Feed an unsupported payload. It must be quarantined, not coerced into a known type.
6. Generate ten recursive variations without new evidence or feedback. The system should flag likely stylistic recursion rather than calling it growth.
