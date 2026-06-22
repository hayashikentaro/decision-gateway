# Product Principles

Decision Gateway exists to protect human judgment quality when automated systems need a decision.

## Core Philosophy

Notification is only an entry point. A notification should get the right human to the right Decision Workspace. It should not carry the whole decision, force a reply in a cramped channel, or turn judgment into a tap-through approval.

Decision happens in a full Decision Workspace. The workspace must show the decision question, source context, goal, decision axis, materials, recommendation, risks, stale-state warnings, and response controls.

Do not optimize for approval rate. A high approval rate can mean the system is asking easy questions, hiding risk, or training the human to rubber-stamp. Optimize for appropriate decisions with clear reasoning.

Avoid "approve because thinking is annoying." The system should reduce unnecessary cognitive cost, not pressure the human into shallow confirmation.

No decision question, no notification. If the source cannot state what decision is needed, Decision Gateway should not notify a human. It should reject or hold the request until the question is clear.

Insufficient materials must be a first-class outcome. The human must be able to say that the request cannot be decided with the provided materials. That outcome is not a failure of the human.

Human cognitive cost is the primary design constraint. Every field, notification, control, and protocol requirement should help the human understand the decision quickly and accurately.

## Practical Rules

- Keep notification copy short and action-oriented.
- Keep sensitive or bulky materials out of notification payloads.
- Preserve enough context to explain why the decision was requested.
- Separate the source recommendation from the human decision.
- Make stale requests visible instead of silently accepting outdated approvals.
- Prefer fewer, clearer decision choices over many vague status states.
