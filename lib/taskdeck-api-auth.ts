import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function constantTimeEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    const maxLength = Math.max(expectedBuffer.length, actualBuffer.length);
    const paddedExpected = Buffer.alloc(maxLength);
    const paddedActual = Buffer.alloc(maxLength);

    expectedBuffer.copy(paddedExpected);
    actualBuffer.copy(paddedActual);
    timingSafeEqual(paddedExpected, paddedActual);
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function requireTaskDeckApiAuth(request: Request): NextResponse | null {
  const configuredToken = process.env.DECISION_GATEWAY_TASKDECK_API_TOKEN;

  if (!configuredToken) {
    return null;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const expectedAuthorization = `Bearer ${configuredToken}`;

  if (!constantTimeEqual(expectedAuthorization, authorization)) {
    return unauthorizedResponse();
  }

  return null;
}
