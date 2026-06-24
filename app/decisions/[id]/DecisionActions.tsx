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
  const [showCloseFallback, setShowCloseFallback] = useState(false);

  async function submit(action: DecisionActionInput) {
    setPendingAction(action.action);
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
    action: DecisionActionInput["action"],
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get("note") ?? "").trim();
    void submit({
      action,
      note: value || undefined,
    });
  }

  function closeTab() {
    setShowCloseFallback(false);
    window.close();
    window.setTimeout(() => setShowCloseFallback(true), 150);
  }

  if (request.status === "resolved") {
    return (
      <section className="panel">
        <h2>Recorded decision</h2>
        <dl className="definition" style={{ marginTop: 14 }}>
          <dt>Outcome</dt>
          <dd>{request.decision?.action}</dd>
          <dt>Note</dt>
          <dd>{request.decision?.note || "None"}</dd>
          <dt>Decided at</dt>
          <dd>{request.decision?.decidedAt}</dd>
        </dl>
        <div className="button-row" style={{ marginTop: 16 }}>
          <button
            className="button secondary"
            onClick={closeTab}
            type="button"
          >
            Close
          </button>
        </div>
        {showCloseFallback ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            If this tab does not close, close it from your browser tab list.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="panel actions">
      <div>
        <h2>Record judgment</h2>
        <p className="muted">
          Choose the next agent action after reviewing the workspace context.
          Missing information is a valid decision, not a failure.
        </p>
      </div>

      {error ? <p className="status-pending">{error}</p> : null}

      <div className="action-box">
        <h3>Proceed</h3>
        <p className="muted">
          Leave blank to continue with the recommended action. Add constraints
          only if needed.
        </p>
        <form onSubmit={(event) => submitForm(event, "proceed")}>
          <textarea
            name="note"
            placeholder="Optional constraints or instructions"
          />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Proceed
          </button>
        </form>
      </div>

      <div className="action-box">
        <h3>Revise plan</h3>
        <p className="muted">
          Do not implement yet. Revise the plan using this feedback and ask
          again.
        </p>
        <form onSubmit={(event) => submitForm(event, "revise_plan")}>
          <textarea
            name="note"
            placeholder="Feedback for the revised plan"
          />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Revise plan
          </button>
        </form>
      </div>

      <div className="action-box">
        <h3>Need more information</h3>
        <p className="muted">
          Do not implement yet. Provide the missing information and ask again.
        </p>
        <form onSubmit={(event) => submitForm(event, "need_more_information")}>
          <textarea
            name="note"
            placeholder="Missing facts, materials, or context"
          />
          <button
            className="button secondary"
            disabled={pendingAction !== null}
            type="submit"
          >
            Need more information
          </button>
        </form>
      </div>
    </section>
  );
}
