# Decision Result Protocol

The decision result is the future source-neutral shape for returning a human decision to the requesting system.

This protocol is documented early so request design does not assume a notification-only product. Return delivery is not an MVP goal.

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
- `delivery.mode`: Future return path mode, such as `mailbox`, `webhook`, or `manual_export`.
- `delivery.status`: Delivery lifecycle state when return delivery exists.
- `stale`: Whether the request or source state became stale before the decision was delivered.

## Stale Handling

Decision Gateway should preserve stale-state evidence. A stale request may require re-confirmation, replacement by a newer request, or returning a stale result with explicit metadata.

## MVP Non-Goal

The MVP records decisions but does not deliver results back to the source system. Result delivery should be added deliberately with protocol, retry, and privacy review.
