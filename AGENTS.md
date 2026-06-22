# AGENTS.md

Guidance for Codex and other AI agents working in this repository.

This repository is intended to track:

```text
git@github.com:hayashikentaro/decision-gateway.git
```

Before changing files, confirm the checkout and working tree:

```sh
pwd
git remote -v
git status --short --branch
```

## Required Context

Read the relevant docs before coding or editing docs:

- Product principles: `docs/product-principles.md`
- Architecture: `docs/architecture.md`
- Decision request protocol: `docs/protocols/decision-request.md`
- Future decision result protocol: `docs/protocols/decision-result.md`
- Agent collaboration: `docs/agents/README.md`
- Review system: `docs/agents/review-system.md`
- UI guidance: `docs/guides/README.md`

## Product Boundary

Decision Gateway owns the human judgment UX. It receives decision requests, creates a Decision Workspace, notifies the human with a link, records the decision, and later returns results through a protocol.

TaskDeck is a separate product. It may be the first source connector, but Decision Gateway must not be described as a TaskDeck feature. Do not put Decision Workspace UI generation responsibility on TaskDeck. Do not invent TaskDeck-specific behavior, TaskDeck-only protocol fields, or direct TaskDeck server exposure unless the user explicitly asks for a protocol change and the docs are updated in the same change.

## Working Guidelines

- Keep changes small, focused, and reviewable.
- Prefer existing repo docs and conventions over inventing new structure.
- Do not implement app code during documentation-only tasks.
- Do not turn future protocol notes into claims of implemented behavior.
- Preserve user changes already present in the working tree.
- Update docs when changing public setup, protocol shape, product semantics, or user-facing workflow.
- Keep notification payloads minimal; put judgment context in the Decision Workspace.

## Verification

Do not claim implementation is complete without running relevant checks.

For every change:

- Run `git diff --check`.
- If package scripts exist, run the relevant format, lint, test, or build checks.
- If no package scripts exist, say that no package scripts were available.
- If a check cannot be run, report why.

Documentation changes still need whitespace verification and a clear report of what was copied, adapted, skipped, or newly written.
