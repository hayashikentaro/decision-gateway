import { NextResponse } from "next/server";

import { decisionActionSchema } from "@/lib/decision-types";
import { recordDecisionAction } from "@/lib/decision-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
}
