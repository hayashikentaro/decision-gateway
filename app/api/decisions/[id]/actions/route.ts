import { NextResponse } from "next/server";

import { decisionActionSchema } from "@/lib/decision-types";
import { recordDecisionAction } from "@/lib/decision-store";

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected decision action API error", {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = decisionActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid decision action",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updated = await recordDecisionAction(id, parsed.data);

    if (!updated) {
      return NextResponse.json(
        { error: "Decision request not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
