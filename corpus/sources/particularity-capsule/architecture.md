# Architecture and trust boundary

## Vertical slice

The capsule implements the smallest complete Return-Bearing Transformation System:

1. **Receive:** commit exact source bytes as an immutable artifact.
2. **Preserve:** declare human-selected exact spans as load-bearing particulars.
3. **Transform:** commit derivative content as a new immutable artifact and record the generator event.
4. **Validate:** compare every declared particular against the derivative, then record a distinct human judgment.
5. **Return:** navigate from derivative → transformation → anchor → exact source span.
6. **Archive:** hash every artifact, maintain an append-only event trail, and sign the canonical manifest.
7. **Re-enter:** open a new derivative draft from any exact source anchor without overwriting earlier history.

## What the prototype proves

- A particular can be represented as exact evidence plus offsets, not only as a summary.
- A derivative can be related to its source without pretending the transformation is reversible.
- Generator and Validator can remain separate in the audit trail.
- A sealed export can detect later modification of source or derivative content.
- The same source anchor can initiate multiple branches while the origin remains immutable.

## What it does not prove

- The source itself is truthful or authentic.
- The validator is independent in a legal or organizational sense.
- Lexical similarity correctly measures semantic preservation.
- A self-signed public key establishes the signer’s real-world identity.
- Browser storage is confidential or suitable for sensitive material.

## Security notes

The ECDSA private key is stored in browser local storage for usability. This is not a secure enclave. A production implementation should use a platform keystore, WebAuthn/passkey-backed signing, or an external signer. Exported capsules contain the public key and signature but not the private key.

Raw source content is included in exported JSON. Add encryption and access policy before using sensitive records.

## Production path

- Replace local storage with an append-only event store and content-addressed object storage.
- Bind signing to WebAuthn or organization-managed keys.
- Store anchors as text selectors plus hashes and contextual selectors to survive format migration.
- Add explicit correction, supersession, deletion-request, and retention-policy events.
- Run Generator, Validator, and Archivist as separate principals with policy-enforced capabilities.
- Add modality-specific anchors for audio time ranges, images, code symbols, and structured records.
