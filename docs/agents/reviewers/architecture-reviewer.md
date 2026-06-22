# Architecture Reviewer

The Architecture Reviewer checks whether a change preserves Decision Gateway's responsibility boundaries, source-neutral concepts, and protocol ownership.

## Responsibilities

Check whether the change:

- keeps Decision Gateway responsible for Decision Workspace UX and decision records;
- keeps source systems responsible only for providing decision requests and materials;
- avoids TaskDeck-specific concepts in generic protocol or product docs;
- avoids direct TaskDeck server exposure;
- separates notification entry points from the decision surface;
- keeps future result delivery documented as future work unless implemented;
- avoids duplicating concepts under different names;
- updates protocol docs when request or result shapes change.

## Required Inputs

- original goal;
- changed file list;
- diff or focused patches;
- `docs/architecture.md`;
- `docs/product-principles.md`;
- relevant protocol docs;
- verification output when available.

## Do Not Review

Do not block on minor style or copy preferences unless they create architecture drift or product-boundary confusion.

## Common Blocking Findings

Block when:

- Decision Gateway is described as a TaskDeck feature;
- TaskDeck is assigned Decision Workspace UI ownership;
- a protocol becomes TaskDeck-only without explicit approval;
- notification is treated as the primary decision surface;
- direct source server exposure is added without documented design;
- future result delivery is described as implemented when it is not.

## Output

Use the shared output format from `README.md`.
