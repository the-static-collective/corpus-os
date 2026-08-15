# Corpus Trust Runtime v0.1

## Product claim

Corpus OS can administer a declared body of artifacts and authority over time without collapsing possession, interpretation, execution, or benefit into one undifferentiated permission model.

The first vertical is **Corpus Casework**: a challengeable evidence environment in which source material, derived interpretations, competing readings, delegated tools, and administrative acts remain returnable and accountable.

The trust analogy is structural and computational:

> A constituted corpus has declared participants, capacities, powers, prohibitions, delegated capabilities, and an inspectable administration history.

This slice does **not** claim that a Corpus declaration creates, proves, or satisfies a legally valid trust in any jurisdiction.

## Why this belongs in Corpus OS

Corpus OS already owns the human-facing seam where immutable artifacts, declared particulars, plural interpretation, return, capability routing, execution receipts, and refusal become one operating environment.

A trust runtime makes one additional distinction explicit:

> The ability to possess, inspect, interpret, execute, administer, benefit, or amend are different capacities and must not silently imply one another.

That is useful well beyond legal practice. It applies to investigations, archives, research, governance, creative estates, compliance, delegated automation, and any long-lived body of work that must survive changes in people and tools.

## Governing laws

1. **Capacity is not identity.** A participant may act only in a capacity declared for that participant.
2. **Capacity is not power.** Holding a capacity does not imply every operation associated with that role.
3. **Execution is not authority.** A delegated capability may perform an operation without acquiring authority to decide facts, amend the declaration, or rewrite source.
4. **Possession is not ownership or truth.** Presence in the corpus proves only that the artifact is within the declared administrative body.
5. **Interpretation is not source.** Derived work remains distinguishable from the admitted artifacts it cites.
6. **Refusal is part of accounting.** Forbidden or undeclared acts return explicit refusal receipts.
7. **Originals remain untouched.** This slice allows derived append operations but no source deletion or rewriting.
8. **Legal validity remains unclaimed.** Corpus can faithfully administer a declared structure without asserting that civil law recognizes it as a trust.
9. **A valid declaration is not automatically the adopted declaration.** Structural validity alone cannot mint executable authority.
10. **Executable admission is consumable.** A genuine Action Warrant is spent once it crosses the Session consequence boundary, even when Session later refuses or the host fails.

## Computational mapping

| Trust-shaped concept | Corpus Runtime representation |
|---|---|
| constituted body / res | `corpusRefs` |
| constituting instrument | `CorpusTrustDeclaration` |
| locally adopted instrument cut | private `AdoptedDeclaration` handle over exact checked-in bytes |
| participant | `TrustParticipant` |
| capacity | `TrustCapacity` |
| delegated power | `TrustPower` |
| outside agent/tool | `TrustCapabilityDescriptor` |
| prohibited act | `forbiddenOperations` / capability `nonAuthority` |
| administrative proposal | `TrustOperationRequest` |
| admission decision | `TrustOperationReceipt` |
| executable admitted act | one-shot `ActionWarrant` |
| consequence result | Session `LaunchReceipt` |
| legal status | always `legalValidity: "unclaimed"` in v0.1 |

These names are operating-environment contracts. They do not replace Project 0 kinds, TranchNode durability law, jurisdiction-specific legal definitions, or donor-repository authority.

## First executable proof

The checked-in `casework.synthetic.json` fixture constitutes one deliberately boring synthetic case body:

- three source artifacts;
- a constitutor;
- an administrator;
- a beneficiary;
- a reviewer;
- externally owned synthetic capabilities;
- explicit powers for inspection, derived append, challenge, and delegated execution;
- explicit refusal of declaration amendment, source removal, and fact declaration.

The pure Trust evaluator proves:

1. administrator inspection of an admitted artifact succeeds;
2. beneficiary inspection succeeds while beneficiary mutation fails;
3. reviewer challenge succeeds without becoming administrator;
4. an actor cannot borrow an undeclared capacity;
5. an artifact outside the declared corpus fails closed;
6. source removal is refused even when attempted by an administrator;
7. delegated capability use preserves external runtime ownership;
8. a capability cannot manufacture factual authority;
9. unknown capability fails closed;
10. the same declaration and request yield the same decision.

## Adopted declaration root

Trust declaration validation and executable adoption are now separate operations.

The v0.1 executable root is intentionally local and synthetic. Corpus loads one checked-in Casework declaration from module-owned location, hashes the exact file bytes before JSON interpretation, requires the code-owned expected raw SHA-256 / trust id / version, applies the existing structural validator, deep-freezes the parsed declaration, and issues an in-process adoption handle recorded in a private registry.

A caller may still construct and inspect any well-formed `CorpusTrustDeclaration`, and the pure Trust Runtime may evaluate it structurally. That does **not** make it executable authority. Only the exact adopted handle may be passed to Action Warrant admission. Copies of the handle do not reproduce its private issuance state.

This is not canonical JSON identity, a signature, a seal, a portable credential, or a legal adoption conclusion. It proves only which local declaration cut this runtime is configured to treat as its executable administrative input.

It also does not authenticate the external caller as the participant id named in a request. Participant authentication is outside this synthetic proof and must not be inferred from declaration adoption.

## Relationship to `corpus:session`

Trust and Session are now composed through the Action Warrant rather than remaining parallel execution paths:

```text
proposal
  ↓
code-owned adopted declaration cut
  ↓
Trust Runtime admission / refusal
  ↓
one issued Action Warrant
  ↓
Session consumes warrant
  ↓
Session capability admission / refusal
  ↓
bounded host completion / failure
  ↓
launch receipt
```

Only Trust-admitted `invoke-capability` actions under the adopted cut can mint warrants. The warrant binds the declaration cut, actor/capacity, purpose, subject, capability id/operation/owner, originating Trust request, and exact operation input.

The Session host-reaching path no longer accepts free `capabilityId`, `operation`, and `input` arguments. It accepts a genuine issued warrant and the lower launch seam independently enforces the same requirement. Consumption occurs synchronously before capability lookup/admission or any host await. Therefore:

- copied warrant representation cannot execute;
- a raw legacy Session call cannot reach the host;
- a Session capability refusal leaves the warrant spent;
- a host failure leaves the warrant spent;
- successful completion leaves the warrant spent;
- replay produces no second Session receipt or host consequence.

Capability ownership remains outside Trust. A transcription tool remains owned by the transcription runtime; a renderer remains owned by its renderer; canonical identity remains owned by the adopted identity authority.

Lower-level capability rules remain independently testable through a pure evaluator that cannot invoke the host.

## Corpus Casework vertical

The larger product loop is:

```text
Open Case
  ↓
inspect admitted evidence
  ↓
create or inspect claims / interpretations
  ↓
return to exact evidence
  ↓
fork a competing interpretation
  ↓
invoke declared tools under adopted bounded authority
  ↓
accept / reject / challenge derived proposals
  ↓
produce a report
  ↓
return every material assertion to evidence and administration history
```

The differentiator is not generic retrieval. It is continuity across:

**evidence → interpretation → authority → action → disagreement → accounting → return**.

## Explicit non-goals

Do not in v0.1:

- claim that a declaration is a legally valid trust;
- encode jurisdiction-specific trust law;
- generate wills, deeds, tax elections, conveyances, or beneficiary designations;
- determine title, beneficial ownership, fiduciary duty, tax treatment, or legal capacity;
- treat declaration adoption as participant authentication;
- create a second canonical identity law;
- create signatures, seals, PKI, portable/network authority, or canonical warrant identity;
- create a second immutable storage law;
- let a model declare a proposition to be fact merely because it generated it;
- let a capability amend its own authority;
- let administration permissions imply source mutation;
- integrate arbitrary shell execution;
- define full declaration succession/revocation law;
- claim durable Causal Accounting before issue #17 proves it;
- build a trust-management GUI before the admission law is proven.

## Follow-on horizon

With the adopted warranted consequence boundary proven:

1. issue #17 may test **Linear Authority / Causal Accounting** as a distinct reconciliation layer rather than smuggling it into adoption;
2. append durable Trust / warrant / consequence receipts through the existing TranchNode boundary without rewriting historical evidence;
3. bind powers to exact artifact/collection scopes beyond the current minimal scope classes;
4. add purpose and condition predicates to powers;
5. distinguish proposal, approval, execution, and review phases for multi-party acts;
6. define succession/replacement of participants and declaration cuts without silently reinterpreting prior receipts;
7. add a real participant-authentication/profile seam if a product surface requires identity beyond declared ids;
8. build the first Corpus Casework UI over a synthetic contested-evidence specimen;
9. only then explore jurisdiction-specific adapters as optional external profiles.

## Stop conditions

Stop and expose the conflict if implementation requires:

- Corpus asserting legal validity;
- a caller making an arbitrary well-formed declaration executable by self-adoption;
- an actor gaining authority merely from possession of data or a model/tool credential;
- a delegated capability rewriting its declaration or authority boundary;
- derived interpretation becoming indistinguishable from source evidence;
- deletion or rewriting of admitted originals;
- a second semantic canonicalizer;
- trust terminology being used to conceal ordinary unrestricted application permissions.

## Governing compression

> Under which adopted constituted body, in which declared capacity, pursuant to what power, over which admitted material, producing what accountable result?

And the executable boundary law:

> No host consequence through the Corpus Session boundary without a genuine issued warrant under the adopted cut.

And the Casework law:

> No conclusion may become easier to reach than its evidence is to recover.
