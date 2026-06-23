"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { DecisionActionInput, StoredDecisionRequest } from "@/lib/decision-types";

type Props = {
  request: StoredDecisionRequest;
};

async function postAction(id: string, action: DecisionActionInput) {
  const response = await fetch(`/api/decisions/${id}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(action),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body);
  }
}

export function DecisionActions({ request }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: DecisionActionInput) {
    setPendingAction(action.type);
    setError(null);

    try {
      await postAction(request.id, action);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed");
    } finally {
      setPendingAction(null);
    }
  }

  function submitForm(
    event: FormEvent<HTMLFormElement>,
    type: DecisionActionInput["type"],
    field: "condition" | "reason",
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get(field) ?? "").trim();
    void submit({
      type,
      [field]: value || undefined,
    });
  }

  if (request.status === "resolved") {
    return (
      <section className="panel">
        <h2>Recorded decision</h2>
        <dl className="definition" style={{ marginTop: 14 }}>
          <dt>Outcome</dt>
          <dd>{request.decision?.type}</dd>
          <dt>Condition</dt>
          <dd>{request.decision?.condition || "None"}</dd>
          <dt>Reason</dt>
          <dd>{request.decision?.reason || "None"}</dd>
          <dt>Decided at</dt>
          <dd>{request.decision?.decidedAt}</dd>
        </dl>
      </section>
    );
  }

  return (
    <section className="panel actions">
      <div>
        <h2>Record judgment</h2>
        <p className="muted">
          Choose the outcome after reviewing the workspace context. Insufficient
          materials is a valid decision, not a failure.
        </p>
      </div>

      {error ? <p className="status-pending">{error}</p> : null}

      <div className="action-box">
        <h3>Conditional accept</h3>
        <form
          onSubmit={(event) =>
            submitForm(event, "conditional_accept", "condition")
          }
        >
          <textarea
            name="condition"
            placeholder="Condition required before the agent proceeds"
          />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Conditional accept
          </button>
        </form>
      </div>

      <div className="action-box">
        <h3>Insufficient materials</h3>
        <form
          onSubmit={(event) =>
            submitForm(event, "insufficient_materials", "reason")
          }
        >
          <textarea
            name="reason"
            placeholder="What is missing or unclear?"
          />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Insufficient materials
          </button>
        </form>
      </div>

      <div className="action-box">
        <h3>Accept</h3>
        <p className="muted">
          Use only when the request is clear and the provided materials are
          enough to proceed.
        </p>
        <button
          className="button secondary"
          disabled={pendingAction !== null}
          onClick={() => void submit({ type: "accept" })}
          type="button"
        >
          Accept
        </button>
      </div>

      <div className="action-box">
        <h3>Suspend</h3>
        <form onSubmit={(event) => submitForm(event, "suspend", "reason")}>
          <textarea name="reason" placeholder="Optional reason or next step" />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Suspend
          </button>
        </form>
      </div>

      <div className="action-box">
        <h3>Reject</h3>
        <form onSubmit={(event) => submitForm(event, "reject", "reason")}>
          <textarea name="reason" placeholder="Optional rejection reason" />
          <button
            className="button danger"
            disabled={pendingAction !== null}
            type="submit"
          >
            Reject
          </button>
        </form>
      </div>
    </section>
  );
}
