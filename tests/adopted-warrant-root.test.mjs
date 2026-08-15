import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  admitActionWarrant,
} from "../.kernel-dist/runtime/action-warrant.js";
import {
  loadAdoptedDeclaration,
} from "../.kernel-dist/runtime/adopted-declaration.js";

const declaration = JSON.parse(
  await readFile(
    new URL("../fixtures/trusts/casework.synthetic.json", import.meta.url),
    "utf8",
  ),
);

function request(overrides = {}) {
  return {
    requestId: "request:adopted-warrant-root",
    trustId: declaration.id,
    actorId: "person:administrator",
    capacity: "administrator",
    operation: "invoke-capability",
    targetScope: "capability",
    targetRef: "artifact:agreement-a",
    capabilityId: "synthetic.echo",
    capabilityOperation: "echo",
    ...overrides,
  };
}

test("a genuine adopted handle may mint an Action Warrant", async () => {
  const adoption = await loadAdoptedDeclaration();
  assert.equal(adoption.adopted, true);

  const admission = admitActionWarrant(
    adoption.handle,
    request(),
    "adopted input",
  );

  assert.equal(admission.admitted, true);
  assert.equal(admission.code, "ACTION_WARRANT_ADMITTED");
  assert.equal(admission.warrant.authorityCut, adoption.handle.authorityCut);
});

test("a structurally valid self-granting declaration cannot mint executable authority", () => {
  const selfGrant = structuredClone(declaration);
  selfGrant.id = "trust:self-granting-caller";
  selfGrant.participants = [
    { id: "person:self-granting-caller", capacities: ["administrator"] },
  ];

  const admission = admitActionWarrant(
    selfGrant,
    request({
      trustId: selfGrant.id,
      actorId: "person:self-granting-caller",
    }),
    "must not become authority",
  );

  assert.equal(admission.admitted, false);
  assert.equal(admission.code, "ACTION_WARRANT_DECLARATION_NOT_ADOPTED");
  assert.equal(admission.trustReceipt, undefined);
  assert.equal(admission.warrant, undefined);
});

test("copied adoption fields cannot mint an Action Warrant", async () => {
  const adoption = await loadAdoptedDeclaration();
  assert.equal(adoption.adopted, true);

  const copies = [
    { ...adoption.handle },
    JSON.parse(JSON.stringify(adoption.handle)),
    structuredClone(adoption.handle),
  ];

  for (const copy of copies) {
    const admission = admitActionWarrant(copy, request(), "copied authority");
    assert.equal(admission.admitted, false);
    assert.equal(admission.code, "ACTION_WARRANT_DECLARATION_NOT_ADOPTED");
    assert.equal(admission.trustReceipt, undefined);
    assert.equal(admission.warrant, undefined);
  }
});
