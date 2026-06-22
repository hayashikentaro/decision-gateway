# Decision Gateway Agent Documentation

This directory contains durable guidance for AI agents working in this repository.

Start with the repository root `AGENTS.md`, then read the product, architecture, protocol, and guide docs relevant to the task.

## Shared Guidance

- Product principles: `../product-principles.md`
- Architecture: `../architecture.md`
- Review system: `review-system.md`
- Reviewer profiles: `reviewers/`
- UI guides: `../guides/`

## Agent Roles

### Implementer

Makes focused repository changes, preserves user work, follows docs before coding, and runs relevant verification. Implementers should keep changes small and avoid adding app code during documentation-only tasks.

### Reviewer

Inspects a change through a narrow gate. Reviewers should report blocking issues, non-blocking notes, concrete evidence, and human decisions needed. They should not implement fixes unless explicitly assigned.

### Decision Composer

Shapes decision requests and workspace content. This role checks that each request has a clear decision question, useful summary, enough materials, and a recommendation that does not pressure the human into rubber-stamping.

### Boundary Reviewer

Checks product and repository boundaries, especially the separation between Decision Gateway and TaskDeck.

### Security Reviewer

Checks privacy, sensitive material handling, notification payloads, source input validation, and future return-path risks.

### UX/Product Reviewer

Checks whether Decision Workspace and notification changes reduce cognitive cost and support defensible human judgment.

## Maintenance Rule

Keep role guidance concise. Put stable product and protocol rules in product, architecture, or protocol docs instead of duplicating them across role pages.
