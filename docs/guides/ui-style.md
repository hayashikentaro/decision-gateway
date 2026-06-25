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

The workspace should make human judgment information easy to scan. Treat
workspace content in three groups.

Required primary content:

- decision question;
- semantic summary;
- recommended decision;
- recommendation reason;
- risks;
- relevant facts;
- materials needed for judgment;
- human decision controls;
- agent instruction field.

Secondary context:

- goal;
- urgency;
- decision axis;
- source label;
- created time;
- pending or resolved state;
- stale or insufficient-materials state.

Avoid showing by default:

- raw source JSON;
- raw material JSON;
- raw recommendation JSON;
- raw request payloads;
- internal routing identifiers such as source ids, task ids, session ids, or
  connector instance ids.

These technical details may be useful for debugging, but they should not compete
with the human's decision surface.

## Notification Style

Notifications are entry points. They should include enough context to decide whether to open the workspace, not enough to decide in the notification itself.

Avoid putting bulky materials, raw logs, secrets, or full recommendations into notifications.

## Controls

Use clear controls for decision outcomes. Destructive or irreversible decisions should require enough context in the workspace, not extra friction in the notification.
