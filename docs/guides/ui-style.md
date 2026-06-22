# UI Style Guide

Decision Gateway UI should prioritize judgment clarity and low cognitive cost. The human should quickly understand the decision question, supporting materials, recommendation, risks, and available outcomes.

## Principles

- Make the Decision Workspace the primary surface.
- Keep notification styling compact and action-oriented.
- Use visual hierarchy to separate question, context, materials, recommendation, and final decision.
- Avoid dense dashboards unless the density directly helps judgment.
- Avoid decorative UI that competes with the decision.
- Make stale state, missing materials, and high urgency visible without alarm fatigue.

## Decision Workspace Layout

The workspace should make these elements easy to scan:

- decision question;
- source and goal;
- decision axis and urgency;
- semantic summary;
- materials;
- recommended decision;
- human decision controls;
- agent instruction field;
- stale or insufficient-materials state.

## Notification Style

Notifications are entry points. They should include enough context to decide whether to open the workspace, not enough to decide in the notification itself.

Avoid putting bulky materials, raw logs, secrets, or full recommendations into notifications.

## Controls

Use clear controls for decision outcomes. Destructive or irreversible decisions should require enough context in the workspace, not extra friction in the notification.
