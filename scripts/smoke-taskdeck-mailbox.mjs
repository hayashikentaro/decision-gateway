/* global AbortSignal, console, fetch */

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { URL, URLSearchParams } from "node:url";

const REQUEST_TIMEOUT_MS = 5_000;
const STARTUP_TIMEOUT_MS = 60_000;
const SMOKE_TASKDECK_API_TOKEN = "smoke-taskdeck-api-token";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Unable to reserve a local smoke test port"));
          return;
        }

        resolve(address.port);
      });
    });
  });
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

async function requestJson(baseUrl, route, options = {}) {
  const headers = {
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };
  const response = await fetch(new URL(route, baseUrl), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (options.expectedStatus !== undefined) {
    assert(
      response.status === options.expectedStatus,
      `${options.method ?? "GET"} ${route} returned ${response.status}, expected ${
        options.expectedStatus
      }: ${text}`,
    );
    return { body, response };
  }

  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${route} failed with ${response.status}: ${text}`,
    );
  }

  return { body, response };
}

async function waitForServer(baseUrl, server, getOutput) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next dev server exited early:\n${getOutput()}`);
    }

    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(1_000),
      });

      if (response.status < 500) {
        return;
      }
    } catch {
      // Keep polling until the dev server is ready or the startup deadline passes.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for Next dev server:\n${getOutput()}`);
}

async function stopServer(server) {
  if (server.exitCode !== null || server.pid === undefined) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        // The server may have exited between SIGTERM and SIGKILL.
      }

      resolve();
    }, 5_000);

    server.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  });
}

function readPairingToken(pairingUrl) {
  const url = new URL(pairingUrl);
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  return new URLSearchParams(fragment).get("token");
}

function taskdeckAuthHeaders(apiToken) {
  return apiToken ? { authorization: `Bearer ${apiToken}` } : {};
}

async function withServer(apiToken, callback, options = {}) {
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const tempDir = await mkdtemp(path.join(tmpdir(), "decision-gateway-mailbox-"));
  const storePath = path.join(tempDir, "decision-requests.json");
  let output = "";
  const env = {
    ...process.env,
    APP_BASE_URL: baseUrl,
    DECISION_GATEWAY_STORE_PATH: storePath,
    DECISION_GATEWAY_TASKDECK_API_TOKEN: apiToken ?? "",
    SLACK_WEBHOOK_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_URL: "",
  };

  if (options.productionLike) {
    env.VERCEL = "1";
  } else {
    delete env.VERCEL;
    delete env.VERCEL_ENV;
  }

  const server = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  server.stdout.on("data", (chunk) => {
    output = `${output}${chunk}`;
    output = output.slice(-12_000);
  });
  server.stderr.on("data", (chunk) => {
    output = `${output}${chunk}`;
    output = output.slice(-12_000);
  });

  try {
    await waitForServer(baseUrl, server, () => output);
    return await callback(baseUrl);
  } finally {
    await stopServer(server);
    await rm(tempDir, { force: true, recursive: true });
  }
}

async function runMailboxFlow(baseUrl, taskdeckInstanceId, apiToken) {
  const taskdeckHeaders = taskdeckAuthHeaders(apiToken);

  const pairing = await requestJson(baseUrl, "/api/pairing-requests", {
    method: "POST",
    headers: taskdeckHeaders,
    body: {
      taskdeckInstanceId,
      taskdeckLabel: "TaskDeck Mailbox Smoke",
    },
  });
  const token = readPairingToken(pairing.body.pairingUrl);
  assert(token, "Pairing URL did not include a token fragment");

  const pairingCompletion = await requestJson(baseUrl, "/api/pairing/complete", {
    method: "POST",
    body: {
      pairingId: pairing.body.pairingId,
      token,
      deviceLabel: "Mailbox Smoke Browser",
    },
  });
  const sessionCookie = getSetCookieHeaders(pairingCompletion.response.headers)[0]
    ?.split(";")[0];
  assert(sessionCookie, "Pairing completion did not set a mobile session cookie");

  const created = await requestJson(baseUrl, "/api/decision-requests", {
    method: "POST",
    headers: taskdeckHeaders,
    body: {
      source: {
        type: "taskdeck",
        taskdeckInstanceId,
        taskId: "task_mailbox_smoke",
        sessionId: "session_mailbox_smoke",
        label: "TaskDeck",
      },
      goal: "Verify mailbox redelivery without authorizing local execution.",
      axis: "delivery_semantics",
      urgency: "normal",
      decisionQuestion:
        "Should Decision Gateway record this passive mailbox smoke decision?",
      semanticSummary:
        "This smoke request only verifies mailbox delivery state. It does not resume, apply, run commands, or perform direct AI operation.",
      materials: [
        {
          type: "text",
          label: "Smoke constraints",
          text: "No resume, no apply, no command, and no direct AI operation.",
        },
      ],
      recommendedDecision: {
        decision: "proceed",
        reason:
          "Proceed only records a passive smoke result for mailbox delivery verification.",
      },
    },
  });

  await requestJson(baseUrl, `/api/decisions/${created.body.id}/actions`, {
    method: "POST",
    headers: {
      cookie: sessionCookie,
    },
    body: {
      action: "proceed",
      note: "Passive smoke decision only; no local execution authorized.",
    },
  });

  const firstPoll = await requestJson(
    baseUrl,
    `/api/taskdeck/mailbox?taskdeckInstanceId=${taskdeckInstanceId}&limit=20`,
    {
      headers: taskdeckHeaders,
    },
  );
  assert(firstPoll.body.items.length === 1, "First mailbox poll did not return one item");

  const firstItem = firstPoll.body.items[0];
  assert(firstItem.status === "picked_up", "First mailbox item was not picked_up");
  assert(firstItem.pickedUpAt, "First mailbox item did not get pickedUpAt");
  assert(
    firstItem.payload.action.action === "proceed",
    "First mailbox item did not use proceed action",
  );
  assert(
    firstItem.payload.action.note ===
      "Passive smoke decision only; no local execution authorized.",
    "First mailbox item did not include the decision note",
  );

  const secondPoll = await requestJson(
    baseUrl,
    `/api/taskdeck/mailbox?taskdeckInstanceId=${taskdeckInstanceId}&limit=20`,
    {
      headers: taskdeckHeaders,
    },
  );
  assert(
    secondPoll.body.items.length === 1,
    "Second mailbox poll before ACK did not redeliver one item",
  );

  const secondItem = secondPoll.body.items[0];
  assert(secondItem.id === firstItem.id, "Second mailbox poll returned a different item");
  assert(secondItem.status === "picked_up", "Second mailbox item was not picked_up");
  assert(
    secondItem.pickedUpAt === firstItem.pickedUpAt,
    "Second mailbox poll changed pickedUpAt",
  );

  const ack = await requestJson(baseUrl, `/api/taskdeck/mailbox/${firstItem.id}/ack`, {
    method: "POST",
    headers: taskdeckHeaders,
    body: {
      taskdeckInstanceId,
    },
  });
  assert(ack.body.item.status === "acknowledged", "ACK did not mark item acknowledged");
  assert(ack.body.item.acknowledgedAt, "ACK did not set acknowledgedAt");

  const thirdPoll = await requestJson(
    baseUrl,
    `/api/taskdeck/mailbox?taskdeckInstanceId=${taskdeckInstanceId}&limit=20`,
    {
      headers: taskdeckHeaders,
    },
  );
  assert(thirdPoll.body.items.length === 0, "Third mailbox poll after ACK returned items");

  return firstItem.id;
}

function assertUnauthorized(body, message) {
  assert(body?.error === "Unauthorized", message);
}

async function runTaskDeckAuthChecks(baseUrl) {
  const protectedRequests = [
    {
      name: "decision request creation",
      route: "/api/decision-requests",
      method: "POST",
      body: {
        invalid: "auth is checked before request validation",
      },
    },
    {
      name: "pairing request creation",
      route: "/api/pairing-requests",
      method: "POST",
      body: {
        taskdeckInstanceId: "tdi_mailbox_auth_pairing",
        taskdeckLabel: "TaskDeck Mailbox Auth Pairing",
      },
    },
    {
      name: "mailbox poll",
      route: "/api/taskdeck/mailbox?taskdeckInstanceId=tdi_mailbox_auth_poll",
      method: "GET",
    },
    {
      name: "mailbox ack",
      route: "/api/taskdeck/mailbox/drm_mailbox_auth_ack/ack",
      method: "POST",
      body: {
        taskdeckInstanceId: "tdi_mailbox_auth_ack",
      },
    },
  ];

  for (const protectedRequest of protectedRequests) {
    const missingAuth = await requestJson(baseUrl, protectedRequest.route, {
      method: protectedRequest.method,
      expectedStatus: 401,
      body: protectedRequest.body,
    });
    assertUnauthorized(
      missingAuth.body,
      `Missing Authorization did not return Unauthorized for ${protectedRequest.name}`,
    );

    const wrongAuth = await requestJson(baseUrl, protectedRequest.route, {
      method: protectedRequest.method,
      expectedStatus: 401,
      headers: {
        authorization: "Bearer wrong-token",
      },
      body: protectedRequest.body,
    });
    assertUnauthorized(
      wrongAuth.body,
      `Wrong Authorization did not return Unauthorized for ${protectedRequest.name}`,
    );
  }
}

async function main() {
  const devItemId = await withServer(null, async (baseUrl) =>
    runMailboxFlow(baseUrl, "tdi_mailbox_smoke_dev", null),
  );
  await withServer(
    null,
    async (baseUrl) => {
      await runTaskDeckAuthChecks(baseUrl);
    },
    { productionLike: true },
  );
  let tokenItemId = "";

  await withServer(SMOKE_TASKDECK_API_TOKEN, async (baseUrl) => {
    await runTaskDeckAuthChecks(baseUrl);
    tokenItemId = await runMailboxFlow(
      baseUrl,
      "tdi_mailbox_smoke_token",
      SMOKE_TASKDECK_API_TOKEN,
    );
  });

  console.log("TaskDeck mailbox smoke passed");
  console.log(`- token unset allowed the mailbox flow without Authorization (${devItemId})`);
  console.log("- production-like token unset rejected protected endpoints with 401");
  console.log("- token set rejected missing Authorization on protected endpoints with 401");
  console.log("- token set rejected wrong Authorization on protected endpoints with 401");
  console.log(`- token set allowed the mailbox flow with correct Authorization (${tokenItemId})`);
  console.log("- second GET redelivered the same item before ACK");
  console.log("- ACK marked the item acknowledged");
  console.log("- third GET returned no items");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
