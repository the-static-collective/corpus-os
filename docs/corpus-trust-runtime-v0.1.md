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

## Computational mapping

| Trust-shaped concept | Corpus Runtime representation |
|---|---|
| constituted body / res | `corpusRefs` |
| constituting instrument | `CorpusTrustDeclaration` |
| participant | `TrustParticipant` |
| capacity | `TrustCapacity` |
| delegated power | `TrustPower` |
| outside agent/tool | `TrustCapabilityDescriptor` |
| prohibited act | `forbiddenOperations` / capability `nonAuthority` |
| administrative act | `TrustOperationRequest` |
| accounting entry | `TrustOperationReceipt` |
| legal status | always `legalValidity: "unclaimed"` in v0.1 |

These names are operating-environment contracts. They do not replace Project 0 kinds, TranchNode durability law, jurisdiction-specific legal definitions, or donor-repository authority.

## First executable proof

The checked-in `casework.synthetic.json` fixture constitutes one deliberately boring synthetic case body:

- three source artifacts;
- a constitutor;
- an administrator;
- a beneficiary;
- a reviewer;
- one externally owned transcription capability;
- explicit powers for inspection, derived append, challenge, and delegated execution;
- explicit refusal of declaration amendment, source removal, and fact declaration.

The evaluator must prove:

1. administrator inspection of an admitted artifact succeeds;
2. beneficiary inspection succeeds while beneficiary mutation fails;
3. reviewer challenge succeeds without becoming administrator;
4. an actor cannot borrow an undeclared capacity;
5. an artifact outside the declared corpus fails closed;
6. source removal is refused even when attempted by an administrator;
7. delegated transcription executes while retaining the external runtime owner;
8. the transcription capability cannot manufacture factual authority;
9. unknown capability fails closed;
10. the same declaration and request yield the same decision.

## Relationship to `corpus:session`

The minimum session proof is now merged on `main`. This slice remains intentionally independent at runtime: it compiles and tests alongside `corpus:session`, but does not yet wrap, replace, or absorb the session capability registry.

A follow-on integration can make Trust Runtime a policy layer around session operations:

```text
human request
  ↓
active trust + declared capacity
  ↓
Trust Runtime admission/refusal
  ↓
Corpus capability registry
  ↓
owned external/local execution
  ↓
launch receipt
  ↓
trust administration receipt
```

The trust layer must not absorb capability ownership. A transcription tool remains owned by the transcription runtime; a renderer remains owned by its renderer; canonical identity remains owned by the adopted identity authority.

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
invoke declared tools under bounded authority
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
- create a second canonical identity law;
- create a second immutable storage law;
- let a model declare a proposition to be fact merely because it generated it;
- let a capability amend its own authority;
- let administration permissions imply source mutation;
- integrate arbitrary shell execution;
- build a trust-management GUI before the admission law is proven.

## Follow-on horizon

With the minimum Corpus session landed and this evaluator green:

1. append trust-operation receipts to session history;
2. bind powers to exact artifact/collection scopes rather than the current minimal scope classes;
3. add purpose and condition predicates to powers;
4. distinguish proposal, approval, execution, and review phases for multi-party acts;
5. add succession/replacement of participants without rewriting prior administration history;
6. connect durable receipts through the existing TranchNode boundary;
7. build the first Corpus Casework UI over a synthetic contested-evidence specimen;
8. only then explore jurisdiction-specific adapters as optional external profiles.

## Stop conditions

Stop and expose the conflict if implementation requires:

- Corpus asserting legal validity;
- an actor gaining authority merely from possession of data or a model/tool credential;
- a delegated capability rewriting its declaration or authority boundary;
- derived interpretation becoming indistinguishable from source evidence;
- deletion or rewriting of admitted originals;
- a second semantic canonicalizer;
- trust terminology being used to conceal ordinary unrestricted application permissions.

## Governing compression

> Under which constituted body, in which capacity, pursuant to what declared power, over which admitted material, producing what accountable result?

And the Casework law:

> No conclusion may become easier to reach than its evidence is to recover.
