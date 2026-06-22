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

## Local Development

Implementation is not bootstrapped yet. When app code is added, document the normal local setup here, including install, run, environment variables, and verification commands.

## Current Non-Goals

- No return delivery to source systems in the MVP.
- No direct TaskDeck server exposure.
- No TaskDeck-specific request protocol.
- No approval-rate optimization.
- No notification without a clear decision question.
- No broad connector marketplace or orchestration runtime in this repository.
