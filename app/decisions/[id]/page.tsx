import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getDecisionRequest } from "@/lib/decision-store";
import { validateMobileSessionCookie } from "@/lib/mobile-session";

import { DecisionActions } from "./DecisionActions";

function stringify(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function renderUnknownList(value: unknown, fallback: string) {
  if (Array.isArray(value) && value.length > 0) {
    return (
      <ul className="list">
        {value.map((item, index) => (
          <li key={index}>{stringify(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "string" && value.trim()) {
    return <p>{value}</p>;
  }

  return <p className="muted">{fallback}</p>;
}

function UnpairedBrowserPage() {
  return (
    <main className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Decision Workspace</p>
          <h1>This browser is not paired.</h1>
          <p className="lead">
            Open a current QR pairing link from your trusted Decision Gateway
            source, then return to the Decision Workspace link.
          </p>
        </div>
        <Link href="/">Home</Link>
      </div>

      <section className="panel">
        <h2>Pairing required</h2>
        <p className="muted">
          Decision details are only shown to a paired mobile browser. Slack
          notifications are entry points and do not carry session secrets.
        </p>
      </section>
    </main>
  );
}

export default async function DecisionWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headerStore = await headers();
  const mobileSession = await validateMobileSessionCookie(
    headerStore.get("cookie"),
  );

  if (!mobileSession) {
    return <UnpairedBrowserPage />;
  }

  const request = await getDecisionRequest(id);

  if (!request) {
    notFound();
  }

  const sourceLabel =
    request.source.label ??
    request.source.id ??
    request.source.type ??
    "Unknown source";

  return (
    <main className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Decision Workspace</p>
          <h1>Review the request before deciding.</h1>
          <p className="lead">
            This workspace is the decision surface. Notifications only point
            here.
          </p>
        </div>
        <Link href="/">Home</Link>
      </div>

      <div className="grid">
        <div className="stack">
          <section className="panel question">
            <p className="eyebrow">Decision question</p>
            <h2>{request.decisionQuestion}</h2>
            <p className="summary">{request.semanticSummary}</p>
            <div className="meta">
              <span className="pill">
                Axis <strong>{request.axis}</strong>
              </span>
              <span className="pill">
                Urgency <strong>{request.urgency}</strong>
              </span>
              <span className={`pill status-${request.status}`}>
                State <strong>{request.status}</strong>
              </span>
            </div>
          </section>

          <section className="panel">
            <h2>Context</h2>
            <dl className="definition" style={{ marginTop: 14 }}>
              <dt>Goal</dt>
              <dd>{request.goal}</dd>
              <dt>Source</dt>
              <dd>
                {sourceLabel}
                <pre>{JSON.stringify(request.source, null, 2)}</pre>
              </dd>
              <dt>Request id</dt>
              <dd>{request.requestId}</dd>
              <dt>Created</dt>
              <dd>{request.createdAt}</dd>
            </dl>
          </section>

          <section className="panel">
            <h2>Relevant facts</h2>
            {renderUnknownList(
              request.relevantFacts,
              "No separate relevant facts were provided. Use the summary and materials.",
            )}
          </section>

          <section className="panel">
            <h2>Risks</h2>
            {renderUnknownList(
              request.risks,
              "No explicit risks were provided. Review the materials before deciding.",
            )}
          </section>

          <section className="panel">
            <h2>Recommended decision</h2>
            <pre>{stringify(request.recommendedDecision)}</pre>
          </section>

          <details>
            <summary>Materials</summary>
            <div className="material-list">
              {request.materials.map((material, index) => (
                <div className="material" key={index}>
                  <strong>{material.label ?? `Material ${index + 1}`}</strong>
                  <p>Type: {material.type}</p>
                  {material.url ? (
                    <p>
                      <a href={material.url}>{material.url}</a>
                    </p>
                  ) : null}
                  {material.text ? <p>{material.text}</p> : null}
                  <pre>{JSON.stringify(material, null, 2)}</pre>
                </div>
              ))}
            </div>
          </details>

          <details>
            <summary>Raw payload</summary>
            <pre>{JSON.stringify(request.rawPayload, null, 2)}</pre>
          </details>
        </div>

        <DecisionActions request={request} />
      </div>
    </main>
  );
}
