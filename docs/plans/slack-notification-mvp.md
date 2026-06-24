# Slack Notification MVP Plan

This is the near-term MVP milestone for proving a local TaskDeck-to-Slack-to-Decision Workspace path. It is not the final architecture and does not include a return path back to TaskDeck.

## Purpose

- Prove that a local AI agent or task supervisor can ask for human judgment without requiring the human to watch the PC.
- Use Slack as the first smartphone notification platform.
- Use Decision Workspace for actual judgment.
- Keep Slack notification as a thin entry point only.

## Repositories Involved

### decision-gateway

Decision Gateway owns:

- decision request API;
- Decision Workspace;
- notification adapter;
- decision storage.

### task-deck

TaskDeck acts as the first source connector. It manually sends decision requests through an "Ask decision" action and may show or copy the returned Decision Workspace URL.

TaskDeck must not own the decision UX. Decision Gateway owns the judgment surface and records the human decision.

## Current Implemented State

Decision Gateway already has:

- Next.js + TypeScript app;
- `POST /api/decision-requests`;
- Decision Workspace route;
- decision action recording;
- local file-backed persistence;
- console notifier;
- optional Slack webhook notifier.

The TaskDeck connector branch currently targets:

- `POST /api/tasks/:taskId/decision-request`;
- `DECISION_GATEWAY_URL`;
- manual "Ask decision" action;
- showing/copying the returned URL.

Exact branch and commit details are tracked in TaskDeck.

## MVP Target Flow

1. Run Decision Gateway locally or on Vercel.
2. Set `SLACK_WEBHOOK_URL` in Decision Gateway.
3. Set `APP_BASE_URL` to the public or local Decision Gateway base URL.
4. Run TaskDeck with `DECISION_GATEWAY_URL` pointing to Decision Gateway.
5. Click "Ask decision" in TaskDeck.
6. Decision Gateway receives and stores the request.
7. Decision Gateway sends a Slack notification.
8. Smartphone receives the Slack notification.
9. Open the Decision Workspace link from the smartphone.
10. Record one decision action in the web UI:
    - `proceed`
    - `revise_plan`
    - `need_more_information`

This milestone is intentionally one-way: recording a decision does not update TaskDeck.

## Slack Notification Requirements

Slack is only an entry point. Judgment must happen in Decision Workspace, not Slack.

Do not include full logs, diffs, secrets, raw materials, or approval buttons in Slack.

Include only:

- decision required;
- axis;
- urgency;
- decision question;
- Decision Workspace URL.

## Environment Variables

Decision Gateway:

- `APP_BASE_URL`: public or local base URL used to generate Decision Workspace links.
- `SLACK_WEBHOOK_URL`: Slack incoming webhook URL for the notification adapter.

TaskDeck:

- `DECISION_GATEWAY_URL`: Decision Gateway base URL used by the TaskDeck connector.

## Local Test Checklist

- [ ] Decision Gateway starts.
- [ ] TaskDeck starts with `DECISION_GATEWAY_URL`.
- [ ] "Ask decision" action appears.
- [ ] Clicking "Ask decision" returns a URL.
- [ ] Slack notification arrives.
- [ ] URL opens Decision Workspace.
- [ ] Decision action can be recorded.
- [ ] No TaskDeck state is changed by sending the request.

## Vercel Deployment Note

Vercel is the intended first public deployment target for Decision Gateway. A public deployment is useful for testing smartphone Slack notification links into Decision Workspace.

File-backed persistence is development-only. Supabase/Postgres should replace file persistence before relying on deployed persistence.

## Non-Goals For This Milestone

- TaskDeck return path.
- Cloud mailbox.
- Agent resume.
- Automatic Needs-you notification.
- Web Push.
- Native app.
- Auth.
- Multi-user/team support.
- Supabase/Postgres migration.

## Next Milestone After Slack Notification

- Deploy Decision Gateway to Vercel.
- Replace file persistence with Supabase/Postgres.
- Harden TaskDeck request payload bounding/redaction.
- Add structured agent-emitted `decision_request` files.
- Add notification quality gate.
- Later add cloud mailbox return path.
