# Reviewer Profiles

Reviewer profiles define narrow, refreshable review roles for Decision Gateway changes.

A reviewer should be reconstructed from this directory, the current goal, the diff, verification output, and relevant repository docs. It should not depend on conversation history.

## Shared Required Inputs

- original goal or work-package prompt;
- explicit allowed files or non-goals;
- changed file list;
- diff or focused patches;
- worker completion report;
- verification commands and results;
- relevant architecture, product, guide, or protocol docs.

If evidence is missing, report it. Do not guess that a check passed.

## Shared Non-Responsibilities

Reviewers should not:

- implement fixes unless explicitly assigned;
- broaden the feature scope;
- rewrite the solution as a preference exercise;
- request unrelated cleanup;
- invent requirements not grounded in the goal or repository docs;
- hide uncertainty.

## Verdicts

Use exactly one primary verdict:

- `PASS`: no blocking or meaningful non-blocking issues found within scope.
- `PASS_WITH_NOTES`: no blocker, but relevant risks, caveats, or follow-up notes exist.
- `BLOCK`: the change should not merge until an issue within scope is fixed.
- `NEEDS_HUMAN`: a product, scope, risk, or tradeoff decision requires human judgment.

## Output Format

```text
Verdict: PASS | PASS_WITH_NOTES | BLOCK | NEEDS_HUMAN

Blocking issues:
- ...

Non-blocking notes:
- ...

Evidence:
- ...

Human decision needed:
- yes/no
- reason: ...
```

## Reviewer List

- Boundary: `boundary-reviewer.md`
- Architecture: `architecture-reviewer.md`
- UX/Product: `ux-product-reviewer.md`
- Test/Regression: `test-regression-reviewer.md`
- Security: `security-reviewer.md`
