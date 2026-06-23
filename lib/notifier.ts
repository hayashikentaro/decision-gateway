import type { StoredDecisionRequest } from "./decision-types";

export async function notifyDecisionRequired(
  request: StoredDecisionRequest,
): Promise<void> {
  const message = [
    "Decision required",
    `Axis: ${request.axis}`,
    `Urgency: ${request.urgency}`,
    `Question: ${request.decisionQuestion}`,
    `Workspace: ${request.url}`,
  ].join("\n");

  console.log(`[decision-gateway]\n${message}`);

  if (!process.env.SLACK_WEBHOOK_URL) {
    return;
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack notification failed: ${response.status} ${body}`);
  }
}
