# Decision Gateway

Decision Gateway is a human judgment service for agentic systems. It receives structured decision requests, creates a Decision Workspace for the human, notifies the human with a link, records the decision, and exposes decision result delivery state through a protocol.

The product exists because a notification is not a decision surface. The notification should get the right human into the right workspace; the workspace should carry the context, tradeoffs, materials, and response controls needed to make a defensible decision.

## What It Is

- A gateway between automated systems and human judgment.
- A Decision Workspace for reviewing a request, materials, recommendation, and possible outcomes.
- A protocol boundary for decision requests and decision results.
- A TaskDeck-addressed result mailbox that source systems can poll without
  exposing local servers.
- A place to preserve decision context, stale-state handling, and insufficient-materials outcomes.

## What It Is Not

- Not a TaskDeck feature or TaskDeck submodule.
- Not a connector/source/orchestration host.
- Not a generic approval inbox optimized for throughput.
- Not a notification-only workflow.
- Not a system that asks humans to approve because thinking is annoying.

## Relationship With TaskDeck

TaskDeck may be the first source connector that emits decision requests into Decision Gateway. TaskDeck remains responsible for connector/source/orchestration hosting. Decision Gateway owns the human judgment UX, Decision Workspace, decision recording, and result mailbox delivery state.

TaskDeck should not generate the Decision Workspace UI. Decision Gateway should not directly expose the TaskDeck server or depend on TaskDeck internals. TaskDeck polls outward for mailbox items and must decide locally whether a result applies to a task or AI session.

## MVP Scope

- Define the decision request protocol.
- Accept decision requests from an initial source such as TaskDeck.
- Create a Decision Workspace for each request.
- Notify a human with a link to that workspace.
- Record the human decision and supporting instruction.
- Treat insufficient materials as a first-class decision outcome.
- Persist decision requests, pairing state, mobile sessions, and decision
  actions in Supabase/Postgres when configured.
- Create TaskDeck-addressed `decision_result_mailbox` items when a decision
  action is recorded for a request with `taskdeckInstanceId`.
- Expose MVP/dev TaskDeck mailbox polling and acknowledgment endpoints scoped
  by `taskdeckInstanceId`.
- Pair mobile browsers through QR links and Secure HttpOnly session cookies.

Near-term plan: [Slack notification MVP](docs/plans/slack-notification-mvp.md).

## Local Development

Decision Gateway currently has a minimal Next.js MVP with Supabase-backed
persistence and a file-backed local fallback.

Use Node 20 and npm 10. This repository is pinned with Volta metadata:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Environment Variables

Copy the example environment file when local overrides are needed:

```bash
cp .env.example .env.local
```

Available variables:

- `APP_BASE_URL`: Base URL used when generating Decision Workspace links. Defaults to the request origin when unset.
- `DECISION_GATEWAY_STORE_PATH`: Optional exact file path for the temporary file-backed decision store.
- `DECISION_GATEWAY_TASKDECK_API_TOKEN`: Shared server-side bearer token for TaskDeck-facing APIs. Optional only for local development; required in deployed/production runtime.
- `SLACK_WEBHOOK_URL`: Optional Slack incoming webhook. When set, Decision Gateway sends the minimal notification payload to Slack.
- `SUPABASE_URL`: Supabase project URL. Required with `SUPABASE_SERVICE_ROLE_KEY` to enable Supabase persistence.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key used only by the server. Required with `SUPABASE_URL`.
- `MOBILE_SESSION_COOKIE_NAME`: Secure HttpOnly mobile browser session cookie name. Defaults to `dg_session`.
- `PAIRING_TOKEN_TTL_MINUTES`: QR pairing token lifetime. Defaults to `30`.
- `MOBILE_SESSION_TTL_DAYS`: Mobile browser session lifetime. Defaults to `90`.

### TaskDeck API Token

TaskDeck-facing APIs are called by the local TaskDeck server. When
`DECISION_GATEWAY_TASKDECK_API_TOKEN` is unset, those APIs keep their current
local development behavior and do not require an `Authorization` header. In a
deployed/production runtime (`VERCEL` or `NODE_ENV=production`), leaving the
token unset fails closed with `401 Unauthorized`. When the variable is set,
Decision Gateway requires this exact header on:

- `POST /api/decision-requests`
- `POST /api/pairing-requests`
- `GET /api/taskdeck/mailbox`
- `POST /api/taskdeck/mailbox/<id>/ack`

```text
Authorization: Bearer <token>
```

Configure the same token in Decision Gateway and TaskDeck. This token is server
side only: it is not sent to the mobile browser, QR URLs, Slack messages, or
Decision Workspace pages. Mobile browser access remains authenticated by the
`dg_session` cookie, and this project does not use Supabase Auth.

### Persistence

When both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, Decision
Gateway uses Supabase/Postgres for shared persistence. The schema is in:

```text
docs/database/supabase-schema.sql
```

When either Supabase variable is missing, Decision Gateway falls back to the
file-backed store for local development and smoke testing. Local development
data is stored in:

```text
data/decision-requests.json
```

That file is ignored by Git because decision requests, materials, decisions, and mailbox payloads may contain sensitive context. In Vercel or production runtime, the temporary smoke-test store uses:

```text
/tmp/decision-gateway/decision-requests.json
```

The Vercel `/tmp` fallback is writable but not durable and may disappear
between invocations, deployments, or runtime instance changes. Configure
Supabase before production use.

### Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the full contents of `docs/database/supabase-schema.sql`.
4. Copy the project URL into `SUPABASE_URL`.
5. Copy the service-role key into `SUPABASE_SERVICE_ROLE_KEY`.
6. Set both variables in Vercel for the Decision Gateway project.
7. Keep the service-role key server-side only. Do not expose it to browser
   code.

### Mobile Browser Pairing

TaskDeck creates a pairing URL with:

```bash
curl -X POST http://localhost:3000/api/pairing-requests \
  -H "content-type: application/json" \
  -d '{
    "taskdeckInstanceId": "tdi_local_dev",
    "taskdeckLabel": "Kentaro MacBook TaskDeck"
  }'
```

If `DECISION_GATEWAY_TASKDECK_API_TOKEN` is configured, include
`-H "Authorization: Bearer $DECISION_GATEWAY_TASKDECK_API_TOKEN"` on this
TaskDeck server request.

The response contains:

```json
{
  "pairingId": "pair_...",
  "pairingUrl": "http://localhost:3000/pair/pair_...#token=...",
  "expiresAt": "2026-06-23T00:00:00.000Z"
}
```

Open the `pairingUrl` in the mobile browser, enter a device label, and confirm
pairing. The browser receives a Secure HttpOnly SameSite=Lax cookie. Decision
Workspace links require that cookie before showing full decision details.

### Example Decision Request

```bash
curl -X POST http://localhost:3000/api/decision-requests \
  -H "content-type: application/json" \
  -d '{
    "source": {
      "type": "taskdeck",
      "taskdeckInstanceId": "tdi_local_dev",
      "taskId": "task_123",
      "sessionId": "session_456",
      "label": "TaskDeck"
    },
    "goal": "Keep the task metadata model extensible without forcing every source to provide the same fields.",
    "axis": "data_model",
    "urgency": "blocking",
    "decisionQuestion": "Should the agent add an optional metadata field to the decision request model?",
    "semanticSummary": "The agent needs to preserve source-specific context for future result routing, but the core protocol should remain source-neutral.",
    "materials": [
      {
        "type": "link",
        "label": "Proposed protocol notes",
        "url": "https://example.invalid/protocol-notes"
      }
    ],
    "recommendedDecision": {
      "decision": "proceed",
      "reason": "Continue only if generic protocol fields remain source-neutral."
    }
  }'
```

If `DECISION_GATEWAY_TASKDECK_API_TOKEN` is configured, include
`-H "Authorization: Bearer $DECISION_GATEWAY_TASKDECK_API_TOKEN"` on this
TaskDeck server request.

Expected response:

```json
{
  "id": "dec_...",
  "requestId": "req_...",
  "url": "http://localhost:3000/decisions/dec_..."
}
```

Open the returned `url` in a paired browser to review the Decision Workspace and
record a decision.

### Decision Response Model

The Decision Workspace presents three primary response actions:

- `proceed`: Continue with the recommended action. An empty note means plain
  proceed; a non-empty note is treated as additional constraints or
  instructions for continuing.
- `revise_plan`: Do not implement yet. Revise the plan using the human feedback
  in `note`, then ask again through Decision Gateway before implementing.
- `need_more_information`: Do not implement yet. Provide the missing
  information, materials, or context requested in `note`, then ask again through
  Decision Gateway when ready.

The decision action API accepts the new shape:

```json
{
  "action": "proceed",
  "note": "Run compatibility checks before continuing."
}
```

Legacy action submissions are normalized for compatibility: `accept` and
`conditional_accept` become `proceed`, while `insufficient_materials` becomes
`need_more_information`. Legacy `reject` and `suspend` remain non-primary
compatibility outcomes and are not shown in the TaskDeck-oriented workspace UI.

### TaskDeck Result Mailbox

When a decision action is recorded for a request that has `taskdeckInstanceId`,
Decision Gateway creates a `decision_result_mailbox` item addressed to that
TaskDeck instance. The original `decision_actions` row remains the audit/history
record. The mailbox row is delivery state for TaskDeck.

TaskDeck polls outward:

```bash
curl "http://localhost:3000/api/taskdeck/mailbox?taskdeckInstanceId=tdi_local_dev&limit=20"
```

If `DECISION_GATEWAY_TASKDECK_API_TOKEN` is configured, include
`-H "Authorization: Bearer $DECISION_GATEWAY_TASKDECK_API_TOKEN"` on mailbox
poll and ACK requests.

The response returns unacknowledged deliverable items for that TaskDeck instance.
Items that are still `pending` are marked `picked_up` when returned. Items that
are already `picked_up` may be redelivered with their original `pickedUpAt`
until TaskDeck acknowledges them:

```json
{
  "items": [
    {
      "id": "drm_...",
      "status": "picked_up",
      "payload": {
        "type": "decision_result",
        "decisionRequestId": "dec_...",
        "decisionActionId": "dact_...",
        "requestId": "req_...",
        "taskId": "task_123",
        "sessionId": "session_456",
        "action": {
          "action": "proceed",
          "note": null,
          "type": "proceed",
          "condition": null,
          "reason": null,
          "legacyType": null,
          "decidedAt": "2026-06-23T00:00:00.000Z"
        },
        "source": {
          "type": "taskdeck",
          "taskdeckInstanceId": "tdi_local_dev",
          "taskId": "task_123",
          "sessionId": "session_456",
          "label": "TaskDeck"
        },
        "goal": "Keep the task metadata model extensible without forcing every source to provide the same fields.",
        "axis": "data_model",
        "urgency": "blocking"
      },
      "createdAt": "2026-06-23T00:00:00.000Z",
      "pickedUpAt": "2026-06-23T00:00:00.000Z"
    }
  ]
}
```

A TaskDeck client can acknowledge an item after it has persisted the payload
locally:

```bash
curl -X POST http://localhost:3000/api/taskdeck/mailbox/drm_.../ack \
  -H "content-type: application/json" \
  -d '{"taskdeckInstanceId":"tdi_local_dev"}'
```

This API is an MVP/dev surface scoped by `taskdeckInstanceId` and, when
configured, the shared TaskDeck API bearer token. TaskDeck must validate
`requestId`, `taskId`, and `sessionId` against local state before applying any
result. TaskDeck must persist the mailbox item locally before ACK; `picked_up`
is not final delivery confirmation. `acknowledged` is the only terminal success
state.

### Auth And Trust Model

See [Decision Gateway Auth Model](docs/security/decision-gateway-auth-model.md).
In short:

- Slack is notification only.
- QR pairing creates a mobile browser session.
- The mobile session can view and record decisions, but cannot command agents.
- TaskDeck server APIs require `DECISION_GATEWAY_TASKDECK_API_TOKEN` outside
  local development.
- TaskDeck remains the local trust root and final application gate.
- The mailbox is an outbox for TaskDeck, not an execution mechanism.
- Supabase Auth is intentionally not used at this stage.

### Checks

```bash
npm run lint
npm run smoke:mailbox
npm run typecheck
npm run build
git diff --check
```

## Current Non-Goals

- No direct TaskDeck server exposure.
- No TaskDeck-specific request protocol.
- No approval-rate optimization.
- No notification without a clear decision question.
- No broad connector marketplace or orchestration runtime in this repository.
- No TaskDeck-side polling worker, result application, AI resume, freeform
  remote command execution, native push, Web Push, Supabase Auth, native mobile
  app, or multi-user/team support yet.
