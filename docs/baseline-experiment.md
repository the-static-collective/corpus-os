# `ring_6` baseline experiment

## Question

Does Corpus OS make a real corpus measurably easier to navigate, extend, audit, and collaborate on than Git + Markdown + lexical/vector search alone?

## Participants

Recruit readers who have not previously seen the corpus. Randomize whether each reader uses baseline A or system B first.

- **A:** the same admitted files in Git + Markdown with ordinary text search.
- **B:** Corpus OS v0.1 using the same admitted bytes.

Do not give B more source material than A.

## Seven tasks

1. Open `ring_6`.
2. Find every admitted occurrence and derivative interpretation.
3. Distinguish quotation from claim, inference, proposal, and rejection.
4. Trace the concept into the return-bearing architecture.
5. Inspect competing readings and unresolved questions.
6. Begin a new analysis from one exact passage without overwriting an existing reading.
7. Export the branch and explain which integrity claims the export can and cannot make.

## Record separately

| Measure | Type | Rule |
|---|---|---|
| Seven-task completion | count | one result per task; no composite truth score |
| Time to exact supporting passage | duration | stop only at the exact admitted span |
| Unsupported lineage claims | count | similarity or prose implication does not count as an edge |
| Quotation / inference errors | count | classify against the fixture types |
| Competing readings lost or overwritten | count | branches must remain independently recoverable |
| Export round-trip failures | count | defer sealed round-trip until Project 0 #5 closes |
| Manual hops | count | record every file, search result, and navigation transition |
| Evidential correctness | categorical / count | assessed from exact support |
| User confidence | self-report | never substitute for evidential correctness |

## Current hypothesis

Corpus OS should reduce manual hops and classification errors while preserving more dissent. It may initially be slower for simple lexical lookup because exact verification and explicit blockers require attention.

## Falsification

The architecture has not earned its cost if unfamiliar readers cannot complete the seven tasks more reliably, or if the system encourages them to trust visually connected but unsupported claims.

The current subset must record sealed-export round-trip as **not testable**, not as a pass, until the one canonical addressing contract is adopted.
