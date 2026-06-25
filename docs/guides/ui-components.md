# UI Components Guide

This guide covers reusable UI component expectations for Decision Gateway.

## Component Priorities

- Keep decision controls stable and predictable.
- Prefer reusable controls for repeated decision actions, material lists, source metadata, stale warnings, and notification previews.
- Keep layouts responsive without hiding the decision question or primary actions.
- Use accessible labels for icon-only controls.
- Do not create local one-off button patterns when a shared control exists.

## Decision Controls

Decision controls should support the expected outcomes for the request type. At minimum, design for:

- proceed;
- revise plan;
- need more information.

For TaskDeck-oriented agent continuation, `proceed` may include an optional note.
An empty note means plain proceed; a non-empty note carries constraints or
instructions. Do not add a separate primary button for proceeding with
constraints.

The source recommendation must not preselect the human decision unless the product explicitly chooses that behavior after review.

## Materials

Material components should show the human-facing label, link, and concise text
needed for the decision. Show type, source, or safety-relevant metadata only
when it changes how the human should judge the material. Do not show raw
material JSON in the default workspace view.

Large or sensitive materials should open in the workspace, not in notifications.

## Empty And Error States

Missing decision questions, missing materials, stale requests, and failed material loads should have explicit states. Do not silently fall back to an approval prompt.
