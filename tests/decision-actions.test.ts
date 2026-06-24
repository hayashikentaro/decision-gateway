import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createDecisionRequest,
  listDeliverableMailboxItems,
  recordDecisionAction,
} from "../lib/decision-store.js";
import {
  decisionActionSchema,
  normalizeDecisionAction,
  type DecisionActionInput,
  type DecisionRequestInput,
} from "../lib/decision-types.js";

const baseRequest: DecisionRequestInput = {
  source: {
    type: "taskdeck",
    taskdeckInstanceId: "tdi_test",
    taskId: "task_test",
    sessionId: "session_test",
    label: "TaskDeck",
  },
  goal: "Verify the decision response model.",
  axis: "agent_continuation",
  urgency: "normal",
  decisionQuestion: "What should the agent do next?",
  semanticSummary: "The agent needs a human decision before continuing.",
  materials: [
    {
      type: "text",
      label: "Plan",
      text: "A concise plan is available for review.",
    },
  ],
};

test("normalizes proceed without note", () => {
  assert.deepEqual(decisionActionSchema.parse({ action: "proceed" }), {
    action: "proceed",
    note: undefined,
  });
});

test("normalizes proceed with note constraints", () => {
  assert.deepEqual(
    decisionActionSchema.parse({
      action: "proceed",
      note: "Run tests before reporting completion.",
    }),
    {
      action: "proceed",
      note: "Run tests before reporting completion.",
    },
  );
});

test("normalizes revise plan", () => {
  assert.deepEqual(
    decisionActionSchema.parse({
      action: "revise_plan",
      note: "Reduce the scope and ask again.",
    }),
    {
      action: "revise_plan",
      note: "Reduce the scope and ask again.",
    },
  );
});

test("normalizes need more information", () => {
  assert.deepEqual(
    decisionActionSchema.parse({
      action: "need_more_information",
      note: "Attach the latest logs.",
    }),
    {
      action: "need_more_information",
      note: "Attach the latest logs.",
    },
  );
});

test("normalizes legacy actions for compatibility", () => {
  assert.deepEqual(normalizeDecisionAction({ type: "accept" }), {
    action: "proceed",
    note: undefined,
    legacyType: "accept",
  });
  assert.deepEqual(
    normalizeDecisionAction({
      type: "conditional_accept",
      condition: "Only after the migration test passes.",
    }),
    {
      action: "proceed",
      note: "Only after the migration test passes.",
      legacyType: "conditional_accept",
    },
  );
  assert.deepEqual(
    normalizeDecisionAction({
      type: "insufficient_materials",
      reason: "Need the failing test output.",
    }),
    {
      action: "need_more_information",
      note: "Need the failing test output.",
      legacyType: "insufficient_materials",
    },
  );
});

async function withFileStore(
  action: DecisionActionInput,
): Promise<Awaited<ReturnType<typeof listDeliverableMailboxItems>>[number]> {
  const storeDir = await mkdtemp(path.join(tmpdir(), "decision-gateway-test-"));
  const previousStorePath = process.env.DECISION_GATEWAY_STORE_PATH;
  const previousSupabaseUrl = process.env.SUPABASE_URL;
  const previousSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.DECISION_GATEWAY_STORE_PATH = path.join(storeDir, "store.json");
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const request = await createDecisionRequest(
      baseRequest,
      "http://localhost:3000",
    );
    const updated = await recordDecisionAction(
      request.id,
      action,
      "paired_device_test",
    );

    assert.equal(updated?.decision?.action, action.action);
    assert.equal(updated?.decision?.note, action.note);

    const items = await listDeliverableMailboxItems("tdi_test");

    assert.equal(items.length, 1);
    return items[0];
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.DECISION_GATEWAY_STORE_PATH;
    } else {
      process.env.DECISION_GATEWAY_STORE_PATH = previousStorePath;
    }

    if (previousSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = previousSupabaseUrl;
    }

    if (previousSupabaseKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseKey;
    }

    await rm(storeDir, { force: true, recursive: true });
  }
}

test("mailbox payload records proceed note as constraints", async () => {
  const item = await withFileStore({
    action: "proceed",
    note: "Run the compatibility checks before continuing.",
  });

  assert.equal(item.payload.action.action, "proceed");
  assert.equal(
    item.payload.action.note,
    "Run the compatibility checks before continuing.",
  );
  assert.equal(item.payload.action.type, "proceed");
  assert.equal(
    item.payload.action.condition,
    "Run the compatibility checks before continuing.",
  );
  assert.equal(item.payload.action.reason, null);
});

test("mailbox payload records revise plan feedback", async () => {
  const item = await withFileStore({
    action: "revise_plan",
    note: "Split the risky change into a separate plan.",
  });

  assert.equal(item.payload.action.action, "revise_plan");
  assert.equal(
    item.payload.action.note,
    "Split the risky change into a separate plan.",
  );
  assert.equal(item.payload.action.condition, null);
  assert.equal(
    item.payload.action.reason,
    "Split the risky change into a separate plan.",
  );
});

test("mailbox payload records missing information request", async () => {
  const item = await withFileStore({
    action: "need_more_information",
    note: "Include the failing command output.",
  });

  assert.equal(item.payload.action.action, "need_more_information");
  assert.equal(item.payload.action.note, "Include the failing command output.");
  assert.equal(item.payload.action.condition, null);
  assert.equal(item.payload.action.reason, "Include the failing command output.");
});
