import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  DecisionActionInput,
  DecisionRequestInput,
  StoredDecisionRequest,
} from "./decision-types";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "decision-requests.json");

type StoreFile = {
  requests: StoredDecisionRequest[];
};

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath, "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { requests: [] };
    }

    throw error;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
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
