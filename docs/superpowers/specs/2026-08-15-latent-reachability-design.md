# Latent Reachability — Design

Date: 2026-08-15
Status: approved for implementation by user pre-authorization in the originating session

## Purpose

Corpus OS can now derive a constituted `WorldCut` from balanced causal history. The next bounded question is not "what will happen?" but:

> Given the constituted present and one already-issued Action Warrant, does that authority still appear eligible to cross the Session attempt boundary without consuming it?

This design calls that question **Latent Reachability**.

Latent Reachability is a prospective, non-authoritative inspection surface. It must never promote possibility into constituted history.

## Governing distinction

```text
constituted present
      +
genuine issued warrant
      ↓
non-consuming inspection
      ↓
ATTEMPT_REACHABLE | explicit block
```

`ATTEMPT_REACHABLE` means only that the supplied genuine warrant is currently unspent, belongs to the same adopted authority cut, targets a currently constituted subject, and passes the same capability policy checked by Session admission.

It does **not** mean:

- the warrant has been spent;
- Session has admitted an execution attempt;
- the host will succeed;
- any output ref exists;
- any future state is constituted;
- any scheduler or automatic executor is authorized;
- any legal-validity claim is made.

## API

Add a pure inspection function:

```ts
inspectLatentReachability(
  worldCut: Readonly<WorldCut>,
  registry: ReadonlyMap<string, Readonly<CapabilityDescriptor>>,
  warrant: unknown,
): Readonly<LatentReachability>
```

The result is one of:

```ts
{
  reachable: true,
  code: "ATTEMPT_REACHABLE",
  trustRequestId: string,
  subjectRef: string,
  capabilityId: string,
  capabilityOperation: string,
  outcome: "unknown-until-attempted",
  legalValidity: "unclaimed"
}
```

or:

```ts
{
  reachable: false,
  code:
    | "LATENT_WARRANT_INVALID"
    | "LATENT_WARRANT_SPENT"
    | "LATENT_BROKEN_LINEAGE"
    | "LATENT_SUBJECT_NOT_CONSTITUTED"
    | RefusalCode,
  legalValidity: "unclaimed"
}
```

For a genuine warrant, blocked results may preserve its trusted `trustRequestId`. Invalid copied/forged objects must not gain identity merely by matching warrant fields.

## Shared capability-policy seam

`runtime/launch.ts` currently embeds capability policy inside `evaluateCapabilityAdmission(...)`, which also constructs refusal receipts. Latent Reachability should not manufacture a hypothetical Session receipt merely to ask whether policy would refuse.

Extract a pure shared policy evaluator:

```ts
evaluateCapabilityPolicy(
  registry,
  warrant,
):
  | { admitted: true; capability }
  | { admitted: false; code: RefusalCode; capabilityId: string; owner: string | null }
```

`evaluateCapabilityAdmission(...)` will consume that pure result and continue constructing the exact same refusal receipt behavior as before. `launchCapability(...)` remains the only path that consumes a warrant and crosses toward the host.

This avoids policy duplication and keeps prospective inspection downstream of the same Session rules.

## Inspection order

`inspectLatentReachability(...)` evaluates in this order:

1. **Genuine warrant identity** — copied/spread/JSON/structured-cloned representations return `LATENT_WARRANT_INVALID`.
2. **Spend state** — already-consumed genuine warrants return `LATENT_WARRANT_SPENT`.
3. **Authority lineage** — warrant `trustId` and `authorityCut` must exactly match `worldCut.root`.
4. **Constituted subject** — warrant `subjectRef` must exist in `worldCut.constitutedRefs`.
5. **Capability policy** — use the shared pure evaluator; preserve its exact `RefusalCode` when blocked.
6. Otherwise return `ATTEMPT_REACHABLE` with outcome explicitly unknown.

The function performs no mutation and does not call the host.

## Authority boundaries

Latent Reachability may inspect genuine in-process Action Warrant identity because that is already the authority model used by Corpus OS. It may not convert copied representation into authority.

A reachable result is evidence about present attempt-eligibility only. It is not itself an Action Warrant, cannot be consumed as one, and must contain no executable authority object.

The result intentionally omits `operationInput`, capability-owner authority, host observations, receipts, and predicted output refs.

## Error handling

All expected negative cases are represented as explicit result codes rather than exceptions. Existing programmer-error behavior in lower runtime seams is unchanged.

Invalid or forged warrant-shaped input fails closed before any warrant fields are trusted.

## Testing

Add focused tests proving:

- a genuine unspent warrant under the matching `WorldCut` can be inspected as `ATTEMPT_REACHABLE`;
- inspection does not consume the warrant;
- copied/spread/JSON/structured-cloned warrant shapes are invalid;
- a spent warrant is blocked;
- a warrant from another trust/authority cut is blocked;
- a warrant whose subject is not currently constituted is blocked;
- each existing capability-policy refusal remains distinguishable;
- a reachable result contains no operation input, receipt, output ref, host result, or warrant object;
- repeated inspection is deterministic and leaves the warrant unspent;
- existing Session execution semantics remain unchanged after the shared-policy extraction.

Wire the focused suite into `npm run check`.

## Documentation

README / architecture documentation should describe Latent Reachability as a non-consuming prospective inspection downstream of Lawful Reachability, with the rule:

> Possible authority is not spent authority, and possible consequence is not constituted reality.

GitBook may receive a project-backed incubator reflection after executable proof lands; GitHub remains implementation authority.

## Non-goals

- counterfactual world simulation;
- predicted host outcomes;
- output-ref prediction;
- automatic warrant discovery or enumeration;
- schedulers, queues, retries, or execution planning;
- durable future-state ledgers;
- signatures, portable warrant identity, or distributed consensus;
- mutation of `WorldCut`;
- legal-validity claims.

## Success criterion

Corpus can answer one prospective question without changing the world:

> "This authority can still be attempted from this constituted present" — or exactly why it cannot.

Nothing about that answer may itself make the attempt happen.