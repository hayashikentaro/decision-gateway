# Decision Gateway Auth Model

Decision Gateway is the cloud decision surface. It stores decision requests,
pairing state, mobile browser sessions, and recorded decision actions.

## Trust Boundaries

- Slack is notification only. Slack messages contain the Decision Workspace URL
  and minimal routing context, but no pairing secrets or mobile session tokens.
- TaskDeck is the local trust root and final gate for applying decisions to AI
  sessions.
- Decision Gateway records decision results. It does not directly command AI
  agents and does not run freeform remote commands.
- TaskDeck will later poll or fetch decision results and decide whether to apply
  them to local AI sessions.

## Mobile Browser Pairing

TaskDeck creates a QR pairing request through `POST /api/pairing-requests`.
Decision Gateway generates a random pairing secret, stores only its hash, and
returns a pairing URL shaped like:

```text
https://decision-gateway.example/pair/<pairingId>#token=<secret>
```

The secret is placed in the URL fragment so the page route does not receive it
as a query parameter. The browser page reads the fragment client-side and sends
it to `POST /api/pairing/complete`.

Successful pairing creates:

- a `paired_devices` row tied to the TaskDeck instance;
- a `mobile_sessions` row with only a hashed session token;
- a Secure HttpOnly SameSite=Lax browser cookie.

The mobile session allows the browser to view Decision Workspace details and
record decisions. It does not authorize direct agent control.

## Persistence

Supabase/Postgres stores:

- TaskDeck instance records;
- QR pairing token hashes and expiry state;
- paired mobile device records;
- hashed mobile browser sessions;
- decision requests and raw request payloads;
- decision action records.

The schema lives at:

```text
docs/database/supabase-schema.sql
```

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set, the server
uses Supabase. When either variable is missing, the server falls back to the
local file store for development and smoke testing.

## Intentional Non-Use Of Supabase Auth

Supabase Auth is intentionally not used at this stage. The first supported
browser identity is a paired mobile browser session represented by the
Decision Gateway cookie. This keeps the MVP focused on TaskDeck-originated
pairing and decision recording without introducing multi-user accounts,
teams, or native app authentication.
