import { NextResponse } from "next/server";
import { z } from "zod";

import { createPairingRequest } from "@/lib/decision-store";
import { requireTaskDeckApiAuth } from "@/lib/taskdeck-api-auth";

const pairingRequestSchema = z.object({
  taskdeckInstanceId: z.string().min(1),
  taskdeckLabel: z.string().min(1).optional(),
});

function getBaseUrl(request: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected pairing request API error", {
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
    const parsed = pairingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid pairing request",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await createPairingRequest({
      taskdeckInstanceId: parsed.data.taskdeckInstanceId,
      taskdeckLabel: parsed.data.taskdeckLabel,
      baseUrl: getBaseUrl(request),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
