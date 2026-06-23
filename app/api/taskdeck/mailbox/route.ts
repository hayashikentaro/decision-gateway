import { NextResponse } from "next/server";
import { z } from "zod";

import {
  listDeliverableMailboxItems,
  markMailboxItemPickedUp,
} from "@/lib/decision-store";
import type { StoredDecisionResultMailboxItem } from "@/lib/decision-types";
import { requireTaskDeckApiAuth } from "@/lib/taskdeck-api-auth";

const mailboxQuerySchema = z.object({
  taskdeckInstanceId: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

function serializeMailboxItem(item: StoredDecisionResultMailboxItem) {
  return {
    id: item.id,
    status: item.status,
    payload: item.payload,
    createdAt: item.createdAt,
    pickedUpAt: item.pickedUpAt ?? null,
  };
}

function logUnexpectedError(error: unknown): void {
  const maybeErrno = error as NodeJS.ErrnoException;

  console.error("[decision-gateway] unexpected TaskDeck mailbox API error", {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function GET(request: Request) {
  try {
    const authFailure = requireTaskDeckApiAuth(request);

    if (authFailure) {
      return authFailure;
    }

    const url = new URL(request.url);
    const parsed = mailboxQuerySchema.safeParse({
      taskdeckInstanceId: url.searchParams.get("taskdeckInstanceId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid mailbox query",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const deliverableItems = await listDeliverableMailboxItems(
      parsed.data.taskdeckInstanceId,
      parsed.data.limit,
    );
    const returnedItems: StoredDecisionResultMailboxItem[] = [];

    for (const item of deliverableItems) {
      if (item.status === "picked_up") {
        returnedItems.push(item);
        continue;
      }

      const pickedUp = await markMailboxItemPickedUp(
        item.id,
        parsed.data.taskdeckInstanceId,
      );

      if (pickedUp) {
        returnedItems.push(pickedUp);
      }
    }

    return NextResponse.json({
      items: returnedItems.map(serializeMailboxItem),
    });
  } catch (error) {
    logUnexpectedError(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
