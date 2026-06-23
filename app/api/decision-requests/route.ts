import { NextResponse } from "next/server";

import { decisionRequestInputSchema } from "@/lib/decision-types";
import { createDecisionRequest } from "@/lib/decision-store";
import { notifyDecisionRequired } from "@/lib/notifier";
import { requireTaskDeckApiAuth } from "@/lib/taskdeck-api-auth";

function getBaseUrl(request: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected decision request API error", {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function POST(request: Request) {
  try {
    const authFailure = requireTaskDeckApiAuth(request);

    if (authFailure) {
      return authFailure;
    }

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
      logUnexpectedError(error);
    }

    return NextResponse.json(
      {
        id: stored.id,
        requestId: stored.requestId,
        url: stored.url,
      },
      { status: 201 },
    );
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
