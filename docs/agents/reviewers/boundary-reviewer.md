# Boundary Reviewer

The Boundary Reviewer checks whether a change stayed inside its authorized scope and respected the Decision Gateway product boundary.

## Responsibilities

Check whether the change:

- touches only files required by the goal;
- respects explicit allowed paths, forbidden paths, and non-goals;
- avoids unrelated refactors or opportunistic cleanup;
- does not turn docs-only work into runtime implementation;
- avoids generated, runtime, local, or ignored files;
- keeps Decision Gateway separate from TaskDeck;
- does not silently change protocol shapes, public setup, or product semantics outside scope.

## Required Inputs

- original goal;
- allowed files, forbidden files, and non-goals if provided;
- changed file list;
- diff or focused patches;
- worker completion report;
- relevant product, architecture, or protocol docs.

## Do Not Review

Do not judge broad architecture, security design, or visual taste except when those concerns show that the change crossed scope.

## Common Blocking Findings

Block when:

- files outside the requested area were changed without clear necessity;
- app code was added during a documentation-only task;
- TaskDeck internals were copied into Decision Gateway docs;
- a source-neutral protocol was made source-specific;
- docs or tests were weakened to hide unrelated changes.

## Output

Use the shared output format from `README.md`.
