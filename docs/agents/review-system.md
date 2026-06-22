# AI Review System

This document defines review gates for Decision Gateway changes.

Review agents should be refreshable from the current goal, changed files, diff, verification output, and repository docs. Reviewers are not implementation helpers by default.

## Purpose

Decision Gateway protects human judgment quality. Review should prevent locally reasonable changes from drifting into a TaskDeck-specific feature, a notification-only approval inbox, or an unsafe protocol surface.

## Review Gates

Use narrow reviewers rather than one broad reviewer.

- Boundary Reviewer: product boundary, scope containment, and TaskDeck separation.
- Architecture Reviewer: source-neutral concepts, ownership, protocol responsibility, and future return-path placement.
- UX/Product Reviewer: decision quality, Decision Workspace clarity, cognitive cost, and notification restraint.
- Security Reviewer: notification privacy, sensitive materials, source input validation, and delivery risk.
- Test/Regression Reviewer: credible verification, scripts, docs consistency, and regression risk.

## Decision Gateway Criteria

Reviewers should pay special attention to:

- product boundary between TaskDeck and Decision Gateway;
- decision UX quality and human cognitive cost;
- notification payload privacy and minimality;
- protocol stability and source neutrality;
- avoiding notification spam;
- treating insufficient materials as a first-class outcome;
- not claiming future return delivery is implemented before it exists.

## Verdicts

Use exactly one primary verdict:

- `PASS`: no blocking or meaningful non-blocking issues found within scope.
- `PASS_WITH_NOTES`: no blocker, but relevant risks or follow-up notes exist.
- `BLOCK`: the change should not merge until an issue within scope is fixed.
- `NEEDS_HUMAN`: the reviewer found a product, scope, risk, or tradeoff decision that requires human judgment.

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

## Non-Goals

The review system is not a replacement for tests, type checks, or human judgment. It should not become a style-lawyer layer or a parallel backlog.
