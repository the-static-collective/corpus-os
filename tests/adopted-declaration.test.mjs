import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isAdoptedDeclaration,
  loadAdoptedDeclaration,
  verifyAdoptedDeclarationBytes,
} from "../.kernel-dist/runtime/adopted-declaration.js";

const fixtureUrl = new URL(
  "../fixtures/trusts/casework.synthetic.json",
  import.meta.url,
);

const expectedSha256 =
  "13ca707bad7ad089cce441de02270f8b7738fa4e8b1ca3cdf19420b8c6cf6a78";

test("code-owned exact declaration bytes load as the adopted authority cut", async () => {
  const result = await loadAdoptedDeclaration();

  assert.equal(result.adopted, true);
  assert.equal(result.code, "ADOPTED_DECLARATION_ADOPTED");
  assert.equal(result.handle.kind, "corpus-adopted-declaration-v0.1");
  assert.equal(result.handle.trustId, "trust:synthetic-casework-001");
  assert.equal(result.handle.authorityCut, "0.1");
  assert.equal(result.handle.rawSha256, expectedSha256);
  assert.equal(result.handle.legalValidity, "unclaimed");
  assert.equal(Object.isFrozen(result.handle), true);
  assert.equal(isAdoptedDeclaration(result.handle), true);
});

test("copied adoption representation does not reproduce adopted authority", async () => {
  const result = await loadAdoptedDeclaration();
  assert.equal(result.adopted, true);

  const copies = [
    { ...result.handle },
    JSON.parse(JSON.stringify(result.handle)),
    structuredClone(result.handle),
  ];

  for (const copy of copies) {
    assert.equal(isAdoptedDeclaration(copy), false);
  }
});

test("structurally valid but byte-modified declaration is not the adopted cut", async () => {
  const fixtureBytes = await readFile(fixtureUrl);
  const declaration = JSON.parse(fixtureBytes.toString("utf8"));
  declaration.purpose = `${declaration.purpose} caller-modified`;
  const modifiedBytes = Buffer.from(`${JSON.stringify(declaration, null, 2)}\n`, "utf8");

  const verification = verifyAdoptedDeclarationBytes(modifiedBytes);

  assert.equal(verification.adopted, false);
  assert.equal(verification.code, "ADOPTED_DECLARATION_BYTES_MISMATCH");
  assert.notEqual(verification.rawSha256, expectedSha256);
  assert.equal(verification.legalValidity, "unclaimed");
});
