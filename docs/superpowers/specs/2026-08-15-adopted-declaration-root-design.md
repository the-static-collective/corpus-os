# Adopted Declaration Root / Mandatory Consequence Boundary — Design

## Goal

Make Corpus OS distinguish a code-owned adopted Trust declaration cut from an arbitrary well-formed declaration supplied by caller code, and make host consequence mechanically require an issued warrant under that adopted cut.

This is issue #16 only. It intentionally does **not** implement Causal Accounting.

## Proof invariant

```text
proposal
  -> code-owned adopted declaration cut
  -> Trust admission
  -> issued one-shot Action Warrant
  -> Session admission
  -> bounded Linux host consequence
  -> terminal receipt
```

Two negative claims must become executable:

1. a caller-created self-granting declaration cannot mint executable authority merely by being internally valid;
2. bare Session invocation cannot reach the host without a genuine issued warrant under the adopted cut.

## Chosen approach

### 1. Local exact-byte adoption root

Use one deliberately local, code-owned adoption descriptor for the synthetic Casework declaration. The descriptor identifies:

- the module-relative declaration fixture path;
- expected trust id;
- expected declaration version / authority cut;
- SHA-256 over the exact declaration file bytes;
- `legalValidity: "unclaimed"`.

Loading the adopted root must:

1. resolve the declaration from code-owned module location, never caller cwd;
2. hash the exact bytes before JSON interpretation;
3. match the code-owned expected byte identity, trust id, and authority cut;
4. run the existing `validateTrustDeclaration` structural validation;
5. issue a frozen in-process `AdoptedDeclaration` handle recorded in a module-private `WeakSet`;
6. return an inspectable adoption receipt containing the raw-byte identity and `legalValidity: "unclaimed"`.

A copied/spread/JSON/`structuredClone` handle is not adopted authority because executable eligibility depends on private issuance, not object shape.

This is a local runtime adoption fact only. It does not create canonical JSON identity, legal validity, portable authority, signatures, or PKI.

### 2. Warrants mint only from adopted authority

Change Action Warrant admission to require a genuine `AdoptedDeclaration` handle rather than a naked `CorpusTrustDeclaration` object.

The existing warrant fields remain inspectable. Warrant issuance remains private `WeakSet` membership. A well-formed but unadopted declaration can still be evaluated structurally by Trust Runtime, but it cannot mint an executable Action Warrant.

### 3. Put one-shot consumption at the Session consequence boundary

Move the one-shot spend check to the narrowest consequence-producing seam.

`CorpusSession` must no longer accept arbitrary `capabilityId`, `operation`, and `input` as a host-reaching production call. The host-reaching call accepts only a genuine issued Action Warrant and derives capability id, operation, owner, and input from that warrant.

Before Session capability admission begins, the Session consequence seam atomically marks that exact warrant object consumed. Therefore:

- Session refusal leaves the warrant spent;
- host failure leaves the warrant spent;
- successful completion leaves the warrant spent;
- a replay cannot produce a second Session receipt or host consequence;
- a caller holding only copied fields cannot reach the host.

Lower-level Session inspection remains independently testable through non-consequence surfaces such as `open(...)`, `capabilities()`, and a pure capability-admission/evaluation helper. The test surface may evaluate capability rules, but only the warranted consequence path can invoke `CorpusHostPort.execute(...)`.

## Why not the alternatives

### Caller-driven `adopt(declaration)`

Rejected. If any caller can pass an arbitrary well-formed declaration to an `adopt` function and receive executable authority, #16 has renamed self-adoption rather than solving it.

### Signatures / canonical tokens / external PKI

Rejected. They expand identity and portability before Corpus has adopted those laws and violate #16's explicit non-goals.

### Leave `CorpusSession.run(id, op, input)` public and rely on convention

Rejected. Documentation does not prove a mandatory consequence boundary. Bare Session host reachability must fail mechanically.

## Error / refusal direction

Adoption failures should be explicit and bounded, for example:

- `ADOPTED_DECLARATION_BYTES_MISMATCH`
- `ADOPTED_DECLARATION_ID_MISMATCH`
- `ADOPTED_DECLARATION_CUT_MISMATCH`
- `ADOPTED_DECLARATION_INVALID`

Warrant admission against anything other than a genuine adopted handle should fail with an explicit non-adopted code and produce no warrant.

Session consequence attempts with copied/unissued/already-consumed warrants must fail before host invocation.

## Tests

The slice should add focused RED/GREEN proofs for:

1. code-owned exact declaration bytes load as one adopted cut with an inspectable raw-byte receipt;
2. modified bytes fail adoption even when the parsed declaration remains structurally valid;
3. a caller-created self-granting but internally valid declaration cannot mint a warrant;
4. copied adoption handles do not become authority;
5. adopted administrator request mints a warrant and crosses Session + host;
6. bare Session consequence call without an issued warrant cannot reach the host;
7. copied warrant representation cannot reach the host;
8. one valid warrant produces at most one Session attempt / host consequence;
9. Session refusal spends the warrant;
10. host failure spends the warrant;
11. existing kernel, intake, Trust, host, browser, corpus verification, and build gates remain green.

## Explicit non-goals

- Causal Accounting / reconciliation;
- legal-validity claims;
- canonical JSON identity;
- cryptographic signatures or seals;
- portable/network adoption or warrants;
- persistence/database adoption state;
- full declaration succession/revocation semantics;
- model/agent integration;
- new host adapters;
- UI.

## Governing compression

> A warrant can prove an action was admitted only after Corpus can prove which declaration was entitled to admit it.

And for the consequence seam:

> No host consequence without an issued warrant under the adopted cut.
