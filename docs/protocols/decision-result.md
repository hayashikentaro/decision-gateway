# Decision Result Protocol

The decision result is the source-neutral shape for returning a human decision
to the requesting system.

Decision Gateway currently records human actions and creates TaskDeck-addressed
mailbox items for requests that include `taskdeckInstanceId`. TaskDeck polling,
local application, retry hardening, and broader production hardening remain
outside Decision Gateway's execution boundary.

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

## Mailbox Delivery Semantics

- `pending`: never delivered to TaskDeck.
- `picked_up`: delivered at least once, but not yet acknowledged by TaskDeck.
- `acknowledged`: TaskDeck has safely recorded the item. This is the only
  terminal success state.
- `expired`: no longer deliverable.

Mailbox polling returns `pending` and `picked_up` items for the requested
TaskDeck instance. Returned `pending` items are marked `picked_up` and receive
`picked_up_at`. Already `picked_up` items are redelivered without changing
`picked_up_at` until TaskDeck ACKs them.

## Stale Handling

Decision Gateway should preserve stale-state evidence. A stale request may require re-confirmation, replacement by a newer request, or returning a stale result with explicit metadata.

## Current Mailbox Boundary

The current mailbox is an outbox for TaskDeck. Decision Gateway stores the
human decision result and lets TaskDeck poll for it. Decision Gateway does not
push into local TaskDeck, command agents, resume AI sessions, or apply decisions
to local work.

TaskDeck must persist a mailbox item locally before ACK, then validate
`requestId`, `taskId`, and `sessionId` before applying a result. When
`DECISION_GATEWAY_TASKDECK_API_TOKEN` is configured, TaskDeck mailbox polling
and ACK requests must include `Authorization: Bearer <token>` from the local
TaskDeck server. This token is not sent to mobile browsers, QR URLs, Slack
messages, or Decision Workspace pages. In deployed/production runtime, an unset
token fails closed; no-token mailbox access is local-development only.
