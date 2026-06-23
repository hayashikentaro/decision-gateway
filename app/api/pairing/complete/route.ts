import { NextResponse } from "next/server";
import { z } from "zod";

import { completePairing } from "@/lib/decision-store";
import { setMobileSessionCookie } from "@/lib/mobile-session";

const pairingCompleteSchema = z.object({
  pairingId: z.string().min(1),
  token: z.string().min(1),
  deviceLabel: z.string().min(1).optional(),
});

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected pairing completion API error", {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = pairingCompleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid pairing completion request",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await completePairing(parsed.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const response = NextResponse.json({
      pairedDeviceId: result.pairedDeviceId,
      expiresAt: result.expiresAt,
    });

    setMobileSessionCookie(response, result.sessionToken, result.expiresAt);
    return response;
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
