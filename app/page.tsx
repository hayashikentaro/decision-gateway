import Link from "next/link";

import { listDecisionRequests } from "@/lib/decision-store";

const sampleCurl = `curl -X POST http://localhost:3000/api/decision-requests \\
  -H "content-type: application/json" \\
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
  }'`;

export default async function HomePage() {
  const requests = await listDecisionRequests();

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">Decision Gateway MVP</p>
          <h1>Human judgment workspace for agentic systems.</h1>
          <p className="lead">
            Decision Gateway receives source-neutral decision requests, creates
            a workspace for the human, and records a decision without turning
            notifications into approval buttons.
          </p>
        </div>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Try a local request</h2>
          <p className="muted">
            Post a decision request, then open the returned workspace URL.
          </p>
          <pre className="code">{sampleCurl}</pre>
        </section>

        <aside className="panel">
          <h2>Docs</h2>
          <ul className="list">
            <li>
              <code>docs/product-principles.md</code>
            </li>
            <li>
              <code>docs/architecture.md</code>
            </li>
            <li>
              <code>docs/protocols/decision-request.md</code>
            </li>
          </ul>
        </aside>
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Recent local decision requests</h2>
        {requests.length === 0 ? (
          <p className="muted">No local decision requests yet.</p>
        ) : (
          <div className="recent">
            {requests.map((request) => (
              <Link
                className="recent-item"
                href={`/decisions/${request.id}`}
                key={request.id}
              >
                <strong>{request.decisionQuestion}</strong>
                <p>
                  {request.axis} · {request.urgency} · {request.status}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
