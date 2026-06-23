# Decision Result Protocol

The decision result is the source-neutral shape for returning a human decision
to the requesting system.

Decision Gateway currently records human actions and creates TaskDeck-addressed
mailbox items for requests that include `taskdeckInstanceId`. TaskDeck polling,
local application, retry hardening, and production authentication remain outside
Decision Gateway's execution boundary.

## Shape

```json
{
  "decisionId": "dec_01HZXAMPLE",
  "requestId": "req_01HZXAMPLE",
  "decision": "approve",
  "agentInstruction": "Apply the migration, then run the database compatibility checks before continuing.",
  "target": {
    "type": "source_request",
    "sourceId": "taskdeck-local",
    "conversationId": "task-123"
  },
  "delivery": {
    "mode": "mailbox",
    "status": "pending"
  },
  "stale": {
    "isStale": false,
    "reason": null,
    "checkedAt": "2026-06-22T00:00:00.000Z"
  }
}
```

## Fields

- `decisionId`: Stable id for the recorded decision.
- `requestId`: Stable id for the original decision request.
- `decision`: Human outcome, such as `approve`, `reject`, `revise`, `insufficient_materials`, or another documented value.
- `agentInstruction`: Optional instruction to the requesting system or agent.
- `target`: Destination metadata for the source system. Keep this source-neutral.
- `delivery.mode`: Return path mode, such as `mailbox`, `webhook`, or `manual_export`.
- `delivery.status`: Delivery lifecycle state. Current mailbox statuses are
  `pending`, `picked_up`, `acknowledged`, and `expired`.
- `stale`: Whether the request or source state became stale before the decision was delivered.

## Stale Handling

Decision Gateway should preserve stale-state evidence. A stale request may require re-confirmation, replacement by a newer request, or returning a stale result with explicit metadata.

## Current Mailbox Boundary

The current mailbox is an outbox for TaskDeck. Decision Gateway stores the
human decision result and lets TaskDeck poll for it. Decision Gateway does not
push into local TaskDeck, command agents, resume AI sessions, or apply decisions
to local work.

TaskDeck must validate `requestId`, `taskId`, and `sessionId` before applying a
result. A production mailbox API also needs a TaskDeck auth token; the current
MVP/dev API is scoped by `taskdeckInstanceId` only.
