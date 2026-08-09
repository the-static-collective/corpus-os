import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluateTrustOperation,
  validateTrustDeclaration,
} from "../.kernel-dist/lib/trust-runtime.js";

const declaration = JSON.parse(
  await readFile(new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url), "utf8"),
);

function request(overrides = {}) {
  return {
    requestId: "request:001",
    trustId: declaration.id,
    actorId: "person:administrator",
    capacity: "administrator",
    operation: "inspect",
    targetScope: "corpus",
    targetRef: "artifact:agreement-a",
    ...overrides,
  };
}

test("synthetic casework declaration is internally consistent", () => {
  const result = validateTrustDeclaration(declaration);
  assert.deepEqual(result, { valid: true, errors: [] });
  assert.equal(declaration.legalValidity, "unclaimed");
});

test("malformed declaration cannot become executable authority", () => {
  const malformed = {
    ...declaration,
    powers: [
      ...declaration.powers,
      {
        capacity: "administrator",
        operation: "remove-source",
        targetScope: "corpus",
      },
    ],
  };

  const validation = validateTrustDeclaration(malformed);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("contradicts forbiddenOperations")));

  const decision = evaluateTrustOperation(malformed, request());
  assert.equal(decision.admitted, false);
  assert.equal(decision.code, "TRUST_DECLARATION_INVALID");
});

test("administrator may inspect an admitted corpus artifact", () => {
  const result = evaluateTrustOperation(declaration, request());
  assert.equal(result.admitted, true);
  assert.equal(result.code, "TRUST_OPERATION_ADMITTED");
  assert.equal(result.legalValidity, "unclaimed");
});

test("beneficiary may inspect but may not append derived state", () => {
  const inspect = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:beneficiary-inspect",
      actorId: "person:beneficiary",
      capacity: "beneficiary",
    }),
  );
  assert.equal(inspect.admitted, true);

  const mutate = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:beneficiary-append",
      actorId: "person:beneficiary",
      capacity: "beneficiary",
      operation: "append-derived",
      targetScope: "derived",
      targetRef: "derived:brief-001",
    }),
  );
  assert.equal(mutate.admitted, false);
  assert.equal(mutate.code, "TRUST_POWER_NOT_GRANTED");
});

test("reviewer may challenge derived interpretation without acquiring administration power", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:reviewer-challenge",
      actorId: "person:reviewer",
      capacity: "reviewer",
      operation: "challenge",
      targetScope: "derived",
      targetRef: "derived:theory-a",
    }),
  );
  assert.equal(result.admitted, true);
  assert.equal(result.code, "TRUST_OPERATION_ADMITTED");
});

test("actor cannot operate in an undeclared capacity", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:false-capacity",
      actorId: "person:beneficiary",
      capacity: "administrator",
    }),
  );
  assert.equal(result.admitted, false);
  assert.equal(result.code, "TRUST_CAPACITY_NOT_DECLARED");
});

test("corpus inspection fails closed for an artifact outside the declared corpus", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:foreign-artifact",
      targetRef: "artifact:not-in-this-trust",
    }),
  );
  assert.equal(result.admitted, false);
  assert.equal(result.code, "TRUST_TARGET_NOT_IN_CORPUS");
});

test("globally forbidden source removal is refused even for administrator", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:remove-source",
      operation: "remove-source",
    }),
  );
  assert.equal(result.admitted, false);
  assert.equal(result.code, "TRUST_OPERATION_FORBIDDEN");
});

test("declared transcription capability may execute and preserves external ownership", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:transcribe",
      operation: "invoke-capability",
      targetScope: "capability",
      targetRef: undefined,
      capabilityId: "synthetic.transcribe",
      capabilityOperation: "transcribe",
    }),
  );
  assert.equal(result.admitted, true);
  assert.equal(result.code, "TRUST_OPERATION_ADMITTED");
  assert.equal(result.capabilityOwner, "fixture.transcription-runtime");
});

test("delegated capability cannot manufacture factual authority", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:declare-fact",
      operation: "invoke-capability",
      targetScope: "capability",
      targetRef: undefined,
      capabilityId: "synthetic.transcribe",
      capabilityOperation: "declare-fact",
    }),
  );
  assert.equal(result.admitted, false);
  assert.equal(result.code, "TRUST_CAPABILITY_NON_AUTHORITY");
  assert.equal(result.capabilityOwner, "fixture.transcription-runtime");
});

test("unknown capability fails closed", () => {
  const result = evaluateTrustOperation(
    declaration,
    request({
      requestId: "request:unknown-capability",
      operation: "invoke-capability",
      targetScope: "capability",
      targetRef: undefined,
      capabilityId: "synthetic.unknown",
      capabilityOperation: "transcribe",
    }),
  );
  assert.equal(result.admitted, false);
  assert.equal(result.code, "TRUST_CAPABILITY_NOT_DECLARED");
});

test("same declaration and request yield the same decision", () => {
  const input = request({ requestId: "request:deterministic" });
  assert.deepEqual(
    evaluateTrustOperation(declaration, input),
    evaluateTrustOperation(declaration, input),
  );
});
