import { createHash } from "node:crypto";

export function hashSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret, "utf8").digest("hex")}`;
}
