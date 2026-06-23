import { NextResponse } from "next/server";
import { z } from "zod";

import { acknowledgeMailboxItem } from "@/lib/decision-store";

const mailboxAckSchema = z.object({
  taskdeckInstanceId: z.string().min(1),
});

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected TaskDeck mailbox ack API error", {
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
    const parsed = mailboxAckSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid mailbox acknowledgment",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // TODO(security): Require a TaskDeck auth token before production. The
    // current taskdeckInstanceId scope is only suitable for MVP/dev polling.
    const item = await acknowledgeMailboxItem(
      id,
      parsed.data.taskdeckInstanceId,
    );

    if (!item) {
      return NextResponse.json(
        { error: "Mailbox item not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        status: item.status,
        acknowledgedAt: item.acknowledgedAt ?? null,
      },
    });
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
