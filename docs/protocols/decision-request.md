# Decision Request Protocol

The decision request is the source-neutral shape for asking Decision Gateway to create a Decision Workspace.

TaskDeck may emit this protocol, but the protocol is not TaskDeck-only.

## Shape

```json
{
  "requestId": "req_01HZXAMPLE",
  "source": {
    "type": "taskdeck",
    "id": "taskdeck-local",
    "label": "TaskDeck"
  },
  "goal": "Decide whether the agent should apply the proposed migration.",
  "axis": "risk_acceptance",
  "urgency": "normal",
  "decisionQuestion": "Should the migration be applied to the current branch?",
  "semanticSummary": "The agent found a schema drift and recommends applying a small migration before continuing.",
  "materials": [
    {
      "type": "link",
      "label": "Proposed diff",
      "url": "https://example.invalid/decision-materials/diff"
    }
  ],
  "recommendedDecision": {
    "decision": "approve",
    "reason": "The migration is narrow and matches the current schema."
  }
}
```

## Fields

- `requestId`: Stable id for the request. A source may provide one, or Decision Gateway may assign one during ingestion.
- `source`: The system requesting the decision. Include stable source identity and a human-readable label.
- `goal`: The larger objective the decision supports.
- `axis`: The kind of judgment needed, such as `risk_acceptance`, `scope_choice`, `policy_exception`, or `insufficient_materials_check`.
- `urgency`: The requested attention level. Initial values: `low`, `normal`, `high`.
- `decisionQuestion`: The exact question the human must answer. Requests without this should not notify a human.
- `semanticSummary`: A concise explanation of the situation in human terms.
- `materials`: Evidence, links, diffs, screenshots, logs, documents, or structured context needed for the decision.
- `recommendedDecision`: Optional source recommendation. It must be visually and semantically separate from the human's final decision.

## Material Guidance

Materials should be sufficient for judgment but should avoid dumping raw logs or sensitive data into notification payloads. Store or link bulky context from the Decision Workspace instead.
