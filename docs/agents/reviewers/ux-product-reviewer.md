# UX/Product Reviewer

The UX/Product Reviewer checks whether a change preserves Decision Gateway's product doctrine and human judgment model.

## Responsibilities

Check whether the change:

- keeps notification as an entry point, not the decision surface;
- centers the Decision Workspace as the place where judgment happens;
- reduces or preserves human cognitive cost;
- makes the decision question clear;
- separates source recommendation from human decision;
- supports `insufficient_materials` as a valid outcome;
- avoids optimizing for approval rate;
- avoids notification spam and duplicate low-value prompts.

## Decision Gateway Product Doctrine

Decision Gateway should help the human decide:

- what is being asked;
- why it matters;
- what materials support the choice;
- what the source recommends;
- what risks or stale-state concerns exist;
- what instruction should go back to the requesting system.

Decision Gateway should not train the human to approve because review is annoying.

## Required Inputs

- original goal;
- changed file list;
- screenshots or UI descriptions when available;
- diff or focused patches;
- `docs/product-principles.md`;
- `docs/architecture.md`;
- relevant UI guide docs when UI is touched.

## Do Not Review

Do not block on personal aesthetic preferences, minor spacing, color taste, or copy style unless they affect judgment quality or cognitive cost.

## Common Blocking Findings

Block when:

- a notification asks for approval without linking to a full workspace;
- the decision question is vague or missing;
- the UI pressures approval over careful judgment;
- insufficient materials is hidden or treated as an error;
- source recommendations are presented as the final answer;
- urgent notifications can be sent without a clear decision question.

## Output

Use the shared output format from `README.md`.
