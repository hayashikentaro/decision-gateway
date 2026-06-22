# Agent Operating Principles

This document records durable principles for AI agents working on Decision Gateway.

Repository docs are for stable product context, architecture, setup, protocols, and design decisions. Do not turn docs into a parallel issue tracker or claim future behavior is implemented.

## Product Boundary

Decision Gateway is the human judgment layer. It is not a TaskDeck feature, connector host, orchestration runtime, or notification-only approval system.

TaskDeck can emit decision requests as a source connector. It must not own Decision Workspace UI generation, and Decision Gateway must not depend on direct TaskDeck server exposure.

## Human Judgment Model

Keep the workflow centered on a clear decision question and a full Decision Workspace.

Useful changes should help the human understand:

- what decision is needed;
- why it is needed now;
- what materials support the decision;
- what the source recommends and why;
- what outcomes are available;
- whether the request is stale or insufficiently supported.

Do not optimize for approvals. Optimize for appropriate, explainable decisions with low unnecessary cognitive cost.

## Boundaries Over Instructions

Prefer explicit protocols, validation, and ownership boundaries over relying on long behavioral instructions.

Examples:

- The decision request protocol is source-neutral.
- Notification payloads are entry points, not decision records.
- The Decision Workspace owns the judgment surface.
- Future return delivery should go through documented result protocols, not source-specific shortcuts.

## Verification

Agents must report checks honestly. For documentation-only changes, at minimum run `git diff --check`. When package scripts exist, run the relevant script checks or explain why they were not applicable.

## Generated And Local Files

Do not commit generated, runtime, local, or secret-bearing files. When implementation exists, document ignored local data paths and treat request materials, notifications, and decision records as potentially sensitive.
