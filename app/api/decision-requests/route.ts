import { NextResponse } from "next/server";

import { decisionRequestInputSchema } from "@/lib/decision-types";
import { createDecisionRequest } from "@/lib/decision-store";
import { notifyDecisionRequired } from "@/lib/notifier";

function getBaseUrl(request: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = decisionRequestInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid decision request",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const stored = await createDecisionRequest(parsed.data, getBaseUrl(request));

  try {
    await notifyDecisionRequired(stored);
  } catch (error) {
    console.error(error);
  }

  return NextResponse.json(
    {
      id: stored.id,
      requestId: stored.requestId,
      url: stored.url,
    },
    { status: 201 },
  );
}
