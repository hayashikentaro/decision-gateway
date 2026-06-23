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

Near-term plan: [Slack notification MVP](docs/plans/slack-notification-mvp.md).

## Local Development

Decision Gateway currently has a minimal Next.js MVP with file-backed local persistence.

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
- `SLACK_WEBHOOK_URL`: Optional Slack incoming webhook. When set, Decision Gateway sends the minimal notification payload to Slack.

### Local Persistence

Development data is stored in:

```text
data/decision-requests.json
```

That file is ignored by Git because decision requests, materials, and decisions may contain sensitive context. The persistence layer lives behind `lib/decision-store.ts` so it can later be replaced by Supabase/Postgres.

### Example Decision Request

```bash
curl -X POST http://localhost:3000/api/decision-requests \
  -H "content-type: application/json" \
  -d '{
    "source": {
      "type": "taskdeck",
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

Open the returned `url` to review the Decision Workspace and record a decision.

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
- No cloud mailbox polling, agent resume, native push, Web Push, auth, multi-user/team support, or Supabase integration yet.
