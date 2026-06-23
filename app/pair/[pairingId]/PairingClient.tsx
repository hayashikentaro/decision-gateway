"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Props = {
  pairingId: string;
};

type PairingState = "ready" | "submitting" | "paired" | "error";

function readFragmentToken(): string {
  const fragment = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(fragment);
  return params.get("token") ?? "";
}

export function PairingClient({ pairingId }: Props) {
  const [deviceLabel, setDeviceLabel] = useState("");
  const [state, setState] = useState<PairingState>("ready");
  const [error, setError] = useState<string | null>(null);
  const [pairedDeviceId, setPairedDeviceId] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = readFragmentToken();

    if (!token) {
      setState("error");
      setError("This pairing link is missing its browser-only token.");
      return;
    }

    setState("submitting");

    try {
      const response = await fetch("/api/pairing/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          pairingId,
          token,
          deviceLabel: deviceLabel.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { pairedDeviceId?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Pairing failed");
      }

      setPairedDeviceId(body?.pairedDeviceId ?? null);
      setState("paired");
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "Pairing failed");
    }
  }

  if (state === "paired") {
    return (
      <section className="panel">
        <p className="eyebrow">Mobile browser session</p>
        <h1>Paired</h1>
        <p className="lead">
          This browser can now open Decision Workspace links and record
          decisions.
        </p>
        {pairedDeviceId ? <p className="muted">Device: {pairedDeviceId}</p> : null}
        <p style={{ marginTop: 18 }}>
          <Link className="button" href="/">
            Home
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">Pair mobile browser</p>
      <h1>Confirm this browser</h1>
      <p className="lead">
        Pairing creates a browser session for viewing and recording decisions.
      </p>

      {error ? <p className="status-pending">{error}</p> : null}

      <form className="pairing-form" onSubmit={submit}>
        <label>
          Device label
          <input
            autoComplete="off"
            name="deviceLabel"
            onChange={(event) => setDeviceLabel(event.target.value)}
            placeholder="Kentaro iPhone"
            value={deviceLabel}
          />
        </label>
        <button
          className="button"
          disabled={state === "submitting"}
          type="submit"
        >
          {state === "submitting" ? "Pairing..." : "Pair browser"}
        </button>
      </form>
      <p className="muted">
        Open the full QR pairing link on this browser. The token is stored in
        the URL fragment and is not sent to the page route.
      </p>
    </section>
  );
}
