import type { NextResponse } from "next/server";

import { validateMobileSession } from "./decision-store";
import type { ValidatedMobileSession } from "./decision-types";

export function getMobileSessionCookieName(): string {
  return process.env.MOBILE_SESSION_COOKIE_NAME || "dg_session";
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");

    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function validateMobileSessionCookie(
  cookieHeader: string | null,
): Promise<ValidatedMobileSession | null> {
  const sessionToken = readCookie(cookieHeader, getMobileSessionCookieName());

  if (!sessionToken) {
    return null;
  }

  return validateMobileSession(sessionToken);
}

export function setMobileSessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt: string,
): void {
  response.cookies.set({
    name: getMobileSessionCookieName(),
    value: sessionToken,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}
