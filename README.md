# Decision Gateway

Decision Gateway is a human judgment service for agentic systems. It receives structured decision requests, creates a Decision Workspace for the human, notifies the human with a link, records the decision, and later returns the result through a protocol.

The product exists because a notification is not a decision surface. The notification should get the right human into the right workspace; the workspace should carry the context, tradeoffs, materials, and response controls needed to make a defensible decision.

## What It Is

- A gateway between automated systems and human judgment.
- A Decision Workspace for reviewing a request, materials, recommendation, and possible outcomes.
- A protocol boundary for decision requests and future decision results.
- A place to preserve decision context, stale-state handling, and insufficient-materials outcomes.

## What It Is Not

- Not a TaskDeck feature or TaskDeck submodule.
- Not a connector/source/orchestration host.
- Not a generic approval inbox optimized for throughput.
- Not a notification-only workflow.
- Not a system that asks humans to approve because thinking is annoying.

## Relationship With TaskDeck

TaskDeck may be the first source connector that emits decision requests into Decision Gateway. TaskDeck remains responsible for connector/source/orchestration hosting. Decision Gateway owns the human judgment UX, Decision Workspace, decision recording, and future result-return protocol.

TaskDeck should not generate the Decision Workspace UI. Decision Gateway should not directly expose the TaskDeck server or depend on TaskDeck internals.

## MVP Scope

- Define the decision request protocol.
- Accept decision requests from an initial source such as TaskDeck.
- Create a Decision Workspace for each request.
- Notify a human with a link to that workspace.
- Record the human decision and supporting instruction.
- Treat insufficient materials as a first-class decision outcome.
- Persist decision requests, pairing state, mobile sessions, and decision
  actions in Supabase/Postgres when configured.
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
- `SLACK_WEBHOOK_URL`: Optional Slack incoming webhook. When set, Decision Gateway sends the minimal notification payload to Slack.
- `SUPABASE_URL`: Supabase project URL. Required with `SUPABASE_SERVICE_ROLE_KEY` to enable Supabase persistence.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key used only by the server. Required with `SUPABASE_URL`.
- `MOBILE_SESSION_COOKIE_NAME`: Secure HttpOnly mobile browser session cookie name. Defaults to `dg_session`.
- `PAIRING_TOKEN_TTL_MINUTES`: QR pairing token lifetime. Defaults to `30`.
- `MOBILE_SESSION_TTL_DAYS`: Mobile browser session lifetime. Defaults to `90`.

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

That file is ignored by Git because decision requests, materials, and decisions may contain sensitive context. In Vercel or production runtime, the temporary smoke-test store uses:

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
      "decision": "conditional_accept",
      "reason": "Allow optional metadata only if generic protocol fields remain source-neutral."
    }
  }'
```

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

### Auth And Trust Model

See [Decision Gateway Auth Model](docs/security/decision-gateway-auth-model.md).
In short:

- Slack is notification only.
- QR pairing creates a mobile browser session.
- The mobile session can view and record decisions, but cannot command agents.
- TaskDeck remains the local trust root and the future final application gate.
- Supabase Auth is intentionally not used at this stage.

### Checks

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Current Non-Goals

- No return delivery to source systems in the MVP.
- No direct TaskDeck server exposure.
- No TaskDeck-specific request protocol.
- No approval-rate optimization.
- No notification without a clear decision question.
- No broad connector marketplace or orchestration runtime in this repository.
- No TaskDeck polling, result application, AI resume, freeform remote command
  execution, native push, Web Push, Supabase Auth, native mobile app, or
  multi-user/team support yet.
