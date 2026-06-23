import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  DecisionActionInput,
  DecisionRequestInput,
  StoredDecisionRequest,
} from "./decision-types";

const localStorePath = path.join(
  process.cwd(),
  "data",
  "decision-requests.json",
);
const temporaryStorePath = "/tmp/decision-gateway/decision-requests.json";

type StoreFile = {
  requests: StoredDecisionRequest[];
};

function getDecisionStorePath(): string {
  if (process.env.DECISION_GATEWAY_STORE_PATH) {
    return process.env.DECISION_GATEWAY_STORE_PATH;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return temporaryStorePath;
  }

  return localStorePath;
}

function getErrorDetails(error: unknown): { code: string; message: string } {
  const maybeErrno = error as NodeJS.ErrnoException;

  return {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

function logStoreFailure(operation: "read" | "write", error: unknown): void {
  const { code, message } = getErrorDetails(error);

  console.error("[decision-store] file store failure", {
    operation,
    storePath: getDecisionStorePath(),
    code,
    message,
  });
}

async function readStore(): Promise<StoreFile> {
  const storePath = getDecisionStorePath();

  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { requests: [] };
    }

    logStoreFailure("read", error);
    throw error;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const storePath = getDecisionStorePath();

  try {
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  } catch (error) {
    logStoreFailure("write", error);
    throw error;
  }
}

export async function createDecisionRequest(
  input: DecisionRequestInput,
  baseUrl: string,
): Promise<StoredDecisionRequest> {
  const now = new Date().toISOString();
  const id = `dec_${randomUUID()}`;
  const request: StoredDecisionRequest = {
    ...input,
    id,
    requestId: input.requestId ?? `req_${randomUUID()}`,
    status: "pending",
    url: `${baseUrl.replace(/\/$/, "")}/decisions/${id}`,
    createdAt: now,
    updatedAt: now,
    rawPayload: input,
  };

  const store = await readStore();
  store.requests.unshift(request);
  await writeStore(store);
  return request;
}

export async function getDecisionRequest(
  id: string,
): Promise<StoredDecisionRequest | null> {
  const store = await readStore();
  return store.requests.find((request) => request.id === id) ?? null;
}

export async function listDecisionRequests(
  limit = 12,
): Promise<StoredDecisionRequest[]> {
  const store = await readStore();
  return store.requests.slice(0, limit);
}

export async function recordDecisionAction(
  id: string,
  action: DecisionActionInput,
): Promise<StoredDecisionRequest | null> {
  const store = await readStore();
  const index = store.requests.findIndex((request) => request.id === id);

  if (index === -1) {
    return null;
  }

  const now = new Date().toISOString();
  const updated: StoredDecisionRequest = {
    ...store.requests[index],
    status: "resolved",
    updatedAt: now,
    decision: {
      ...action,
      decidedAt: now,
    },
  };

  store.requests[index] = updated;
  await writeStore(store);
  return updated;
}
