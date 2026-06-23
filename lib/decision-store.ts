import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateDecisionResultMailboxItemInput,
  DecisionActionInput,
  DecisionResultMailboxPayload,
  DecisionResultMailboxStatus,
  DecisionRequestInput,
  StoredDecisionAction,
  StoredDecisionResultMailboxItem,
  StoredDecisionRequest,
  ValidatedMobileSession,
} from "./decision-types";
import { hashSecret } from "./token-utils";

const localStorePath = path.join("data", "decision-requests.json");
const temporaryStorePath = "/tmp/decision-gateway/decision-requests.json";

type TaskdeckInstanceRecord = {
  id: string;
  label?: string;
  createdAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
};

type PairingTokenRecord = {
  id: string;
  taskdeckInstanceId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
};

type PairedDeviceRecord = {
  id: string;
  taskdeckInstanceId: string;
  label?: string;
  createdAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
};

type MobileSessionRecord = {
  id: string;
  pairedDeviceId: string;
  sessionTokenHash: string;
  expiresAt: string;
  lastSeenAt?: string;
  revokedAt?: string;
  createdAt: string;
};

type StoreFile = {
  requests: StoredDecisionRequest[];
  decisionResultMailbox?: StoredDecisionResultMailboxItem[];
  taskdeckInstances?: TaskdeckInstanceRecord[];
  pairingTokens?: PairingTokenRecord[];
  pairedDevices?: PairedDeviceRecord[];
  mobileSessions?: MobileSessionRecord[];
};

type PairingRequestResult = {
  pairingId: string;
  pairingUrl: string;
  expiresAt: string;
};

export type PairingCompletionResult =
  | {
      ok: true;
      pairedDeviceId: string;
      expiresAt: string;
      sessionToken: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

type SupabaseDecisionRequestRow = {
  id: string;
  request_id: string;
  taskdeck_instance_id: string | null;
  task_id: string | null;
  session_id: string | null;
  status: "pending" | "resolved";
  url: string;
  source: unknown;
  goal: string;
  axis: string;
  urgency: string;
  decision_question: string;
  semantic_summary: string;
  materials: unknown;
  recommended_decision: unknown | null;
  relevant_facts: unknown | null;
  risks: unknown | null;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type SupabaseDecisionActionRow = {
  id: string;
  decision_request_id: string;
  paired_device_id: string | null;
  type: DecisionActionInput["type"];
  condition: string | null;
  reason: string | null;
  decided_at: string;
};

type SupabaseDecisionResultMailboxRow = {
  id: string;
  taskdeck_instance_id: string;
  decision_request_id: string;
  decision_action_id: string;
  request_id: string;
  task_id: string | null;
  session_id: string | null;
  status: DecisionResultMailboxStatus;
  payload: unknown;
  created_at: string;
  picked_up_at: string | null;
  acknowledged_at: string | null;
  expires_at: string | null;
};

type SupabasePairingTokenRow = {
  id: string;
  taskdeck_instance_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

type SupabaseMobileSessionRow = {
  id: string;
  paired_device_id: string;
  session_token_hash: string;
  expires_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type SupabasePairedDeviceRow = {
  id: string;
  taskdeck_instance_id: string;
  label: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

let supabaseClient: SupabaseClient | null = null;

function getDecisionStorePath(): string {
  if (process.env.DECISION_GATEWAY_STORE_PATH) {
    return process.env.DECISION_GATEWAY_STORE_PATH;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return temporaryStorePath;
  }

  return localStorePath;
}

function shouldUseSupabaseStore(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseClient(): SupabaseClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase store requested without required environment variables");
  }

  supabaseClient ??= createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return supabaseClient;
}

function getErrorDetails(error: unknown): { code: string; message: string } {
  const maybeErrno = error as NodeJS.ErrnoException;

  return {
    code: typeof maybeErrno.code === "string" ? maybeErrno.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

function logStoreFailure(operation: string, error: unknown): void {
  const { code, message } = getErrorDetails(error);

  console.error("[decision-store] store failure", {
    operation,
    backend: shouldUseSupabaseStore() ? "supabase" : "file",
    storePath: shouldUseSupabaseStore() ? undefined : getDecisionStorePath(),
    code,
    message,
  });
}

function normalizeStore(store: StoreFile): StoreFile {
  return {
    requests: Array.isArray(store.requests) ? store.requests : [],
    decisionResultMailbox: Array.isArray(store.decisionResultMailbox)
      ? store.decisionResultMailbox
      : [],
    taskdeckInstances: Array.isArray(store.taskdeckInstances)
      ? store.taskdeckInstances
      : [],
    pairingTokens: Array.isArray(store.pairingTokens) ? store.pairingTokens : [],
    pairedDevices: Array.isArray(store.pairedDevices) ? store.pairedDevices : [],
    mobileSessions: Array.isArray(store.mobileSessions) ? store.mobileSessions : [],
  };
}

async function readStore(): Promise<Required<StoreFile>> {
  const storePath = getDecisionStorePath();

  try {
    const raw = await readFile(storePath, "utf8");
    return normalizeStore(JSON.parse(raw) as StoreFile) as Required<StoreFile>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return normalizeStore({ requests: [] }) as Required<StoreFile>;
    }

    logStoreFailure("read", error);
    throw error;
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const storePath = getDecisionStorePath();

  try {
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(
      storePath,
      `${JSON.stringify(normalizeStore(store), null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    logStoreFailure("write", error);
    throw error;
  }
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeLimit(limit: number, fallback: number, max: number): number {
  return Number.isFinite(limit) && limit > 0
    ? Math.min(Math.floor(limit), max)
    : fallback;
}

function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function extractSourceIds(input: DecisionRequestInput): {
  taskdeckInstanceId?: string;
  taskId?: string;
  sessionId?: string;
} {
  const source = input.source as Record<string, unknown>;

  return {
    taskdeckInstanceId: toOptionalString(source.taskdeckInstanceId),
    taskId: toOptionalString(source.taskId),
    sessionId: toOptionalString(source.sessionId),
  };
}

function buildStoredDecisionRequest(
  input: DecisionRequestInput,
  baseUrl: string,
): StoredDecisionRequest {
  const now = new Date().toISOString();
  const id = `dec_${randomUUID()}`;
  const sourceIds = extractSourceIds(input);

  return {
    ...input,
    ...sourceIds,
    id,
    requestId: input.requestId ?? `req_${randomUUID()}`,
    status: "pending",
    url: `${baseUrl.replace(/\/$/, "")}/decisions/${id}`,
    createdAt: now,
    updatedAt: now,
    rawPayload: input,
  };
}

function mapActionRow(row: SupabaseDecisionActionRow): StoredDecisionAction {
  return {
    id: row.id,
    type: row.type,
    condition: row.condition ?? undefined,
    reason: row.reason ?? undefined,
    pairedDeviceId: row.paired_device_id ?? undefined,
    decidedAt: row.decided_at,
  };
}

function mapMailboxRow(
  row: SupabaseDecisionResultMailboxRow,
): StoredDecisionResultMailboxItem {
  return {
    id: row.id,
    taskdeckInstanceId: row.taskdeck_instance_id,
    decisionRequestId: row.decision_request_id,
    decisionActionId: row.decision_action_id,
    requestId: row.request_id,
    taskId: row.task_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    status: row.status,
    payload: row.payload as DecisionResultMailboxPayload,
    createdAt: row.created_at,
    pickedUpAt: row.picked_up_at ?? undefined,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  };
}

function mapRequestRow(
  row: SupabaseDecisionRequestRow,
  action?: SupabaseDecisionActionRow | null,
): StoredDecisionRequest {
  const rawPayload = row.raw_payload as DecisionRequestInput;

  return {
    ...rawPayload,
    id: row.id,
    requestId: row.request_id,
    taskdeckInstanceId: row.taskdeck_instance_id ?? undefined,
    taskId: row.task_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    source: row.source as DecisionRequestInput["source"],
    goal: row.goal,
    axis: row.axis,
    urgency: row.urgency,
    decisionQuestion: row.decision_question,
    semanticSummary: row.semantic_summary,
    materials: row.materials as DecisionRequestInput["materials"],
    recommendedDecision: row.recommended_decision ?? undefined,
    relevantFacts: row.relevant_facts ?? undefined,
    risks: row.risks ?? undefined,
    status: row.status,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decision: action ? mapActionRow(action) : undefined,
    rawPayload,
  };
}

function buildDecisionResultPayload(
  request: StoredDecisionRequest,
  action: StoredDecisionAction,
): DecisionResultMailboxPayload {
  if (!action.id) {
    throw new Error("Decision action id is required to create mailbox payload");
  }

  return {
    type: "decision_result",
    decisionRequestId: request.id,
    decisionActionId: action.id,
    requestId: request.requestId,
    taskId: request.taskId ?? null,
    sessionId: request.sessionId ?? null,
    action: {
      type: action.type,
      condition: action.condition ?? null,
      reason: action.reason ?? null,
      decidedAt: action.decidedAt,
    },
    source: request.source,
    goal: request.goal,
    axis: request.axis,
    urgency: request.urgency,
  };
}

function buildDecisionResultMailboxItem(
  input: CreateDecisionResultMailboxItemInput,
  nowIso = new Date().toISOString(),
): StoredDecisionResultMailboxItem {
  return {
    id: `drm_${randomUUID()}`,
    taskdeckInstanceId: input.taskdeckInstanceId,
    decisionRequestId: input.decisionRequestId,
    decisionActionId: input.decisionActionId,
    requestId: input.requestId,
    taskId: input.taskId,
    sessionId: input.sessionId,
    status: "pending",
    payload: input.payload,
    createdAt: nowIso,
    expiresAt: input.expiresAt,
  };
}

async function getLatestAction(
  id: string,
): Promise<SupabaseDecisionActionRow | null> {
  const { data, error } = await getSupabaseClient()
    .from("decision_actions")
    .select("*")
    .eq("decision_request_id", id)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SupabaseDecisionActionRow | null;
}

function compareHashes(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

async function createDecisionRequestInSupabase(
  input: DecisionRequestInput,
  baseUrl: string,
): Promise<StoredDecisionRequest> {
  const request = buildStoredDecisionRequest(input, baseUrl);

  const { error } = await getSupabaseClient().from("decision_requests").insert({
    id: request.id,
    request_id: request.requestId,
    taskdeck_instance_id: request.taskdeckInstanceId ?? null,
    task_id: request.taskId ?? null,
    session_id: request.sessionId ?? null,
    status: request.status,
    url: request.url,
    source: request.source,
    goal: request.goal,
    axis: request.axis,
    urgency: request.urgency,
    decision_question: request.decisionQuestion,
    semantic_summary: request.semanticSummary,
    materials: request.materials,
    recommended_decision: request.recommendedDecision ?? null,
    relevant_facts: request.relevantFacts ?? null,
    risks: request.risks ?? null,
    raw_payload: request.rawPayload,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    expires_at: null,
  });

  if (error) {
    throw error;
  }

  return request;
}

async function getDecisionRequestFromSupabase(
  id: string,
): Promise<StoredDecisionRequest | null> {
  const { data, error } = await getSupabaseClient()
    .from("decision_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRequestRow(
    data as SupabaseDecisionRequestRow,
    await getLatestAction(id),
  );
}

async function listDecisionRequestsFromSupabase(
  limit: number,
): Promise<StoredDecisionRequest[]> {
  const { data, error } = await getSupabaseClient()
    .from("decision_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as SupabaseDecisionRequestRow[]).map((row) => mapRequestRow(row));
}

async function createDecisionResultMailboxItemInSupabase(
  input: CreateDecisionResultMailboxItemInput,
): Promise<StoredDecisionResultMailboxItem> {
  const item = buildDecisionResultMailboxItem(input);

  const { error } = await getSupabaseClient()
    .from("decision_result_mailbox")
    .insert({
      id: item.id,
      taskdeck_instance_id: item.taskdeckInstanceId,
      decision_request_id: item.decisionRequestId,
      decision_action_id: item.decisionActionId,
      request_id: item.requestId,
      task_id: item.taskId ?? null,
      session_id: item.sessionId ?? null,
      status: item.status,
      payload: item.payload,
      created_at: item.createdAt,
      picked_up_at: null,
      acknowledged_at: null,
      expires_at: item.expiresAt ?? null,
    });

  if (error) {
    throw error;
  }

  return item;
}

async function listDeliverableMailboxItemsFromSupabase(
  taskdeckInstanceId: string,
  limit: number,
): Promise<StoredDecisionResultMailboxItem[]> {
  const { data, error } = await getSupabaseClient()
    .from("decision_result_mailbox")
    .select("*")
    .eq("taskdeck_instance_id", taskdeckInstanceId)
    .in("status", ["pending", "picked_up"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data as SupabaseDecisionResultMailboxRow[]).map(mapMailboxRow);
}

async function markMailboxItemPickedUpInSupabase(
  id: string,
  taskdeckInstanceId: string,
): Promise<StoredDecisionResultMailboxItem | null> {
  const { data, error } = await getSupabaseClient()
    .from("decision_result_mailbox")
    .update({
      status: "picked_up",
      picked_up_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("taskdeck_instance_id", taskdeckInstanceId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMailboxRow(data as SupabaseDecisionResultMailboxRow) : null;
}

async function acknowledgeMailboxItemInSupabase(
  id: string,
  taskdeckInstanceId: string,
): Promise<StoredDecisionResultMailboxItem | null> {
  const { data, error } = await getSupabaseClient()
    .from("decision_result_mailbox")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("taskdeck_instance_id", taskdeckInstanceId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMailboxRow(data as SupabaseDecisionResultMailboxRow) : null;
}

async function recordDecisionActionInSupabase(
  id: string,
  action: DecisionActionInput,
  pairedDeviceId?: string,
): Promise<StoredDecisionRequest | null> {
  const existing = await getDecisionRequestFromSupabase(id);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const actionId = `dact_${randomUUID()}`;
  const storedAction: StoredDecisionAction = {
    id: actionId,
    ...action,
    pairedDeviceId,
    decidedAt: now,
  };

  const { error: insertError } = await getSupabaseClient()
    .from("decision_actions")
    .insert({
      id: actionId,
      decision_request_id: id,
      paired_device_id: pairedDeviceId ?? null,
      type: action.type,
      condition: action.condition ?? null,
      reason: action.reason ?? null,
      decided_at: now,
    });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await getSupabaseClient()
    .from("decision_requests")
    .update({
      status: "resolved",
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) {
    throw updateError;
  }

  if (existing.taskdeckInstanceId) {
    await createDecisionResultMailboxItemInSupabase({
      taskdeckInstanceId: existing.taskdeckInstanceId,
      decisionRequestId: existing.id,
      decisionActionId: actionId,
      requestId: existing.requestId,
      taskId: existing.taskId,
      sessionId: existing.sessionId,
      payload: buildDecisionResultPayload(existing, storedAction),
    });
  }

  return getDecisionRequestFromSupabase(id);
}

export async function createDecisionRequest(
  input: DecisionRequestInput,
  baseUrl: string,
): Promise<StoredDecisionRequest> {
  try {
    if (shouldUseSupabaseStore()) {
      return await createDecisionRequestInSupabase(input, baseUrl);
    }

    const request = buildStoredDecisionRequest(input, baseUrl);
    const store = await readStore();
    store.requests.unshift(request);
    await writeStore(store);
    return request;
  } catch (error) {
    logStoreFailure("createDecisionRequest", error);
    throw error;
  }
}

export async function getDecisionRequest(
  id: string,
): Promise<StoredDecisionRequest | null> {
  try {
    if (shouldUseSupabaseStore()) {
      return await getDecisionRequestFromSupabase(id);
    }

    const store = await readStore();
    return store.requests.find((request) => request.id === id) ?? null;
  } catch (error) {
    logStoreFailure("getDecisionRequest", error);
    throw error;
  }
}

export async function listDecisionRequests(
  limit = 12,
): Promise<StoredDecisionRequest[]> {
  try {
    if (shouldUseSupabaseStore()) {
      return await listDecisionRequestsFromSupabase(limit);
    }

    const store = await readStore();
    return store.requests.slice(0, limit);
  } catch (error) {
    logStoreFailure("listDecisionRequests", error);
    throw error;
  }
}

export async function createDecisionResultMailboxItem(
  input: CreateDecisionResultMailboxItemInput,
): Promise<StoredDecisionResultMailboxItem> {
  try {
    if (shouldUseSupabaseStore()) {
      return await createDecisionResultMailboxItemInSupabase(input);
    }

    const item = buildDecisionResultMailboxItem(input);
    const store = await readStore();
    store.decisionResultMailbox.unshift(item);
    await writeStore(store);
    return item;
  } catch (error) {
    logStoreFailure("createDecisionResultMailboxItem", error);
    throw error;
  }
}

export async function listDeliverableMailboxItems(
  taskdeckInstanceId: string,
  limit = 20,
): Promise<StoredDecisionResultMailboxItem[]> {
  try {
    const safeLimit = normalizeLimit(limit, 20, 100);

    if (shouldUseSupabaseStore()) {
      return await listDeliverableMailboxItemsFromSupabase(
        taskdeckInstanceId,
        safeLimit,
      );
    }

    const store = await readStore();
    return store.decisionResultMailbox
      .filter(
        (item) =>
          item.taskdeckInstanceId === taskdeckInstanceId &&
          (item.status === "pending" || item.status === "picked_up"),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, safeLimit);
  } catch (error) {
    logStoreFailure("listDeliverableMailboxItems", error);
    throw error;
  }
}

export async function markMailboxItemPickedUp(
  id: string,
  taskdeckInstanceId: string,
): Promise<StoredDecisionResultMailboxItem | null> {
  try {
    if (shouldUseSupabaseStore()) {
      return await markMailboxItemPickedUpInSupabase(id, taskdeckInstanceId);
    }

    const store = await readStore();
    const item = store.decisionResultMailbox.find(
      (candidate) =>
        candidate.id === id &&
        candidate.taskdeckInstanceId === taskdeckInstanceId &&
        candidate.status === "pending",
    );

    if (!item) {
      return null;
    }

    item.status = "picked_up";
    item.pickedUpAt = new Date().toISOString();
    await writeStore(store);
    return item;
  } catch (error) {
    logStoreFailure("markMailboxItemPickedUp", error);
    throw error;
  }
}

export async function acknowledgeMailboxItem(
  id: string,
  taskdeckInstanceId: string,
): Promise<StoredDecisionResultMailboxItem | null> {
  try {
    if (shouldUseSupabaseStore()) {
      return await acknowledgeMailboxItemInSupabase(id, taskdeckInstanceId);
    }

    const store = await readStore();
    const item = store.decisionResultMailbox.find(
      (candidate) =>
        candidate.id === id && candidate.taskdeckInstanceId === taskdeckInstanceId,
    );

    if (!item) {
      return null;
    }

    item.status = "acknowledged";
    item.acknowledgedAt = new Date().toISOString();
    await writeStore(store);
    return item;
  } catch (error) {
    logStoreFailure("acknowledgeMailboxItem", error);
    throw error;
  }
}

export async function recordDecisionAction(
  id: string,
  action: DecisionActionInput,
  pairedDeviceId?: string,
): Promise<StoredDecisionRequest | null> {
  try {
    if (shouldUseSupabaseStore()) {
      return await recordDecisionActionInSupabase(id, action, pairedDeviceId);
    }

    const store = await readStore();
    const index = store.requests.findIndex((request) => request.id === id);

    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    const actionId = `dact_${randomUUID()}`;
    const updated: StoredDecisionRequest = {
      ...store.requests[index],
      status: "resolved",
      updatedAt: now,
      decision: {
        id: actionId,
        ...action,
        pairedDeviceId,
        decidedAt: now,
      },
    };

    store.requests[index] = updated;

    if (updated.taskdeckInstanceId && updated.decision?.id) {
      store.decisionResultMailbox.unshift(
        buildDecisionResultMailboxItem(
          {
            taskdeckInstanceId: updated.taskdeckInstanceId,
            decisionRequestId: updated.id,
            decisionActionId: updated.decision.id,
            requestId: updated.requestId,
            taskId: updated.taskId,
            sessionId: updated.sessionId,
            payload: buildDecisionResultPayload(updated, updated.decision),
          },
          now,
        ),
      );
    }

    await writeStore(store);
    return updated;
  } catch (error) {
    logStoreFailure("recordDecisionAction", error);
    throw error;
  }
}

export async function createPairingRequest(input: {
  taskdeckInstanceId: string;
  taskdeckLabel?: string;
  baseUrl: string;
}): Promise<PairingRequestResult> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = addMinutes(
      now,
      getPositiveIntegerEnv("PAIRING_TOKEN_TTL_MINUTES", 30),
    ).toISOString();
    const pairingId = `pair_${randomUUID()}`;
    const secret = generateSecret();
    const tokenHash = hashSecret(secret);

    if (shouldUseSupabaseStore()) {
      const client = getSupabaseClient();
      const { error: instanceError } = await client
        .from("taskdeck_instances")
        .upsert(
          {
            id: input.taskdeckInstanceId,
            label: input.taskdeckLabel ?? null,
            last_seen_at: nowIso,
          },
          { onConflict: "id" },
        );

      if (instanceError) {
        throw instanceError;
      }

      const { error: tokenError } = await client.from("pairing_tokens").insert({
        id: pairingId,
        taskdeck_instance_id: input.taskdeckInstanceId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
      });

      if (tokenError) {
        throw tokenError;
      }
    } else {
      const store = await readStore();
      const existingIndex = store.taskdeckInstances.findIndex(
        (instance) => instance.id === input.taskdeckInstanceId,
      );

      const instance: TaskdeckInstanceRecord = {
        id: input.taskdeckInstanceId,
        label: input.taskdeckLabel,
        createdAt:
          existingIndex >= 0
            ? store.taskdeckInstances[existingIndex].createdAt
            : nowIso,
        lastSeenAt: nowIso,
        revokedAt:
          existingIndex >= 0
            ? store.taskdeckInstances[existingIndex].revokedAt
            : undefined,
      };

      if (existingIndex >= 0) {
        store.taskdeckInstances[existingIndex] = instance;
      } else {
        store.taskdeckInstances.push(instance);
      }

      store.pairingTokens.push({
        id: pairingId,
        taskdeckInstanceId: input.taskdeckInstanceId,
        tokenHash,
        expiresAt,
        createdAt: nowIso,
      });

      await writeStore(store);
    }

    return {
      pairingId,
      pairingUrl: `${input.baseUrl.replace(/\/$/, "")}/pair/${pairingId}#token=${secret}`,
      expiresAt,
    };
  } catch (error) {
    logStoreFailure("createPairingRequest", error);
    throw error;
  }
}

export async function completePairing(input: {
  pairingId: string;
  token: string;
  deviceLabel?: string;
}): Promise<PairingCompletionResult> {
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const sessionExpiresAt = addDays(
      now,
      getPositiveIntegerEnv("MOBILE_SESSION_TTL_DAYS", 90),
    ).toISOString();
    const sessionToken = generateSecret();
    const sessionTokenHash = hashSecret(sessionToken);
    const providedTokenHash = hashSecret(input.token);

    if (shouldUseSupabaseStore()) {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("pairing_tokens")
        .select("*")
        .eq("id", input.pairingId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const pairingToken = data as SupabasePairingTokenRow | null;

      if (!pairingToken) {
        return { ok: false, status: 404, error: "Pairing request not found" };
      }

      if (pairingToken.used_at) {
        return { ok: false, status: 409, error: "Pairing request was already used" };
      }

      if (new Date(pairingToken.expires_at).getTime() <= now.getTime()) {
        return { ok: false, status: 410, error: "Pairing request expired" };
      }

      if (!compareHashes(pairingToken.token_hash, providedTokenHash)) {
        return { ok: false, status: 401, error: "Invalid pairing token" };
      }

      const { data: updatedTokens, error: usedError } = await client
        .from("pairing_tokens")
        .update({ used_at: nowIso })
        .eq("id", input.pairingId)
        .is("used_at", null)
        .select("id");

      if (usedError) {
        throw usedError;
      }

      if (!updatedTokens || updatedTokens.length !== 1) {
        return { ok: false, status: 409, error: "Pairing request was already used" };
      }

      const pairedDeviceId = `pdev_${randomUUID()}`;
      const mobileSessionId = `msess_${randomUUID()}`;
      const { error: deviceError } = await client.from("paired_devices").insert({
        id: pairedDeviceId,
        taskdeck_instance_id: pairingToken.taskdeck_instance_id,
        label: input.deviceLabel ?? null,
        last_seen_at: nowIso,
      });

      if (deviceError) {
        throw deviceError;
      }

      const { error: sessionError } = await client.from("mobile_sessions").insert({
        id: mobileSessionId,
        paired_device_id: pairedDeviceId,
        session_token_hash: sessionTokenHash,
        expires_at: sessionExpiresAt,
        last_seen_at: nowIso,
        revoked_at: null,
      });

      if (sessionError) {
        throw sessionError;
      }

      return {
        ok: true,
        pairedDeviceId,
        expiresAt: sessionExpiresAt,
        sessionToken,
      };
    }

    const store = await readStore();
    const pairingToken = store.pairingTokens.find(
      (record) => record.id === input.pairingId,
    );

    if (!pairingToken) {
      return { ok: false, status: 404, error: "Pairing request not found" };
    }

    if (pairingToken.usedAt) {
      return { ok: false, status: 409, error: "Pairing request was already used" };
    }

    if (new Date(pairingToken.expiresAt).getTime() <= now.getTime()) {
      return { ok: false, status: 410, error: "Pairing request expired" };
    }

    if (!compareHashes(pairingToken.tokenHash, providedTokenHash)) {
      return { ok: false, status: 401, error: "Invalid pairing token" };
    }

    pairingToken.usedAt = nowIso;
    const pairedDeviceId = `pdev_${randomUUID()}`;
    store.pairedDevices.push({
      id: pairedDeviceId,
      taskdeckInstanceId: pairingToken.taskdeckInstanceId,
      label: input.deviceLabel,
      createdAt: nowIso,
      lastSeenAt: nowIso,
    });
    store.mobileSessions.push({
      id: `msess_${randomUUID()}`,
      pairedDeviceId,
      sessionTokenHash,
      expiresAt: sessionExpiresAt,
      lastSeenAt: nowIso,
      createdAt: nowIso,
    });
    await writeStore(store);

    return {
      ok: true,
      pairedDeviceId,
      expiresAt: sessionExpiresAt,
      sessionToken,
    };
  } catch (error) {
    logStoreFailure("completePairing", error);
    throw error;
  }
}

export async function validateMobileSession(
  sessionToken: string,
): Promise<ValidatedMobileSession | null> {
  try {
    const sessionTokenHash = hashSecret(sessionToken);
    const now = new Date();
    const nowIso = now.toISOString();

    if (shouldUseSupabaseStore()) {
      const client = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await client
        .from("mobile_sessions")
        .select("*")
        .eq("session_token_hash", sessionTokenHash)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      const session = sessionData as SupabaseMobileSessionRow | null;

      if (
        !session ||
        session.revoked_at ||
        new Date(session.expires_at).getTime() <= now.getTime()
      ) {
        return null;
      }

      const { data: deviceData, error: deviceError } = await client
        .from("paired_devices")
        .select("*")
        .eq("id", session.paired_device_id)
        .maybeSingle();

      if (deviceError) {
        throw deviceError;
      }

      const device = deviceData as SupabasePairedDeviceRow | null;

      if (!device || device.revoked_at) {
        return null;
      }

      await Promise.all([
        client
          .from("mobile_sessions")
          .update({ last_seen_at: nowIso })
          .eq("id", session.id),
        client
          .from("paired_devices")
          .update({ last_seen_at: nowIso })
          .eq("id", device.id),
        client
          .from("taskdeck_instances")
          .update({ last_seen_at: nowIso })
          .eq("id", device.taskdeck_instance_id),
      ]);

      return {
        id: session.id,
        pairedDeviceId: device.id,
        taskdeckInstanceId: device.taskdeck_instance_id,
        expiresAt: session.expires_at,
      };
    }

    const store = await readStore();
    const session = store.mobileSessions.find(
      (record) => record.sessionTokenHash === sessionTokenHash,
    );

    if (
      !session ||
      session.revokedAt ||
      new Date(session.expiresAt).getTime() <= now.getTime()
    ) {
      return null;
    }

    const device = store.pairedDevices.find(
      (record) => record.id === session.pairedDeviceId,
    );

    if (!device || device.revokedAt) {
      return null;
    }

    const instance = store.taskdeckInstances.find(
      (record) => record.id === device.taskdeckInstanceId,
    );

    session.lastSeenAt = nowIso;
    device.lastSeenAt = nowIso;

    if (instance) {
      instance.lastSeenAt = nowIso;
    }

    await writeStore(store);

    return {
      id: session.id,
      pairedDeviceId: device.id,
      taskdeckInstanceId: device.taskdeckInstanceId,
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    logStoreFailure("validateMobileSession", error);
    throw error;
  }
}
