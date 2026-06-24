import { z } from "zod";

export const primaryDecisionActionValues = [
  "proceed",
  "revise_plan",
  "need_more_information",
] as const;

export const decisionActionValues = [
  ...primaryDecisionActionValues,
  "legacy_reject",
  "legacy_suspend",
] as const;

export const legacyDecisionActionValues = [
  "accept",
  "conditional_accept",
  "suspend",
  "reject",
  "insufficient_materials",
] as const;

export type PrimaryDecisionAction = (typeof primaryDecisionActionValues)[number];
export type DecisionActionValue = (typeof decisionActionValues)[number];
export type LegacyDecisionAction = (typeof legacyDecisionActionValues)[number];

export type DecisionActionInput = {
  action: DecisionActionValue;
  note?: string;
  legacyType?: LegacyDecisionAction;
};

function toOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = toOptionalTrimmedString(value);

    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
}

export function normalizeDecisionAction(input: {
  action?: unknown;
  type?: unknown;
  note?: unknown;
  comment?: unknown;
  condition?: unknown;
  reason?: unknown;
}): DecisionActionInput | null {
  const requestedAction = toOptionalTrimmedString(input.action) ??
    toOptionalTrimmedString(input.type);
  const note = firstString(
    input.note,
    input.comment,
    input.condition,
    input.reason,
  );

  switch (requestedAction) {
    case "proceed":
    case "revise_plan":
    case "need_more_information":
    case "legacy_reject":
    case "legacy_suspend":
      return {
        action: requestedAction,
        note,
      };
    case "accept":
      return {
        action: "proceed",
        note,
        legacyType: "accept",
      };
    case "conditional_accept":
      return {
        action: "proceed",
        note,
        legacyType: "conditional_accept",
      };
    case "insufficient_materials":
      return {
        action: "need_more_information",
        note,
        legacyType: "insufficient_materials",
      };
    case "reject":
      return {
        action: "legacy_reject",
        note,
        legacyType: "reject",
      };
    case "suspend":
      return {
        action: "legacy_suspend",
        note,
        legacyType: "suspend",
      };
    default:
      return null;
  }
}

export function getDecisionActionCondition(
  action: DecisionActionInput,
): string | undefined {
  return action.action === "proceed" ? action.note : undefined;
}

export function getDecisionActionReason(
  action: DecisionActionInput,
): string | undefined {
  return action.action === "proceed" ? undefined : action.note;
}

export const decisionMaterialSchema = z
  .object({
    type: z.string().min(1),
    label: z.string().min(1).optional(),
    url: z.string().url().optional(),
    text: z.string().optional(),
  })
  .passthrough();

export const decisionRequestInputSchema = z
  .object({
    requestId: z.string().min(1).optional(),
    source: z
      .object({
        type: z.string().min(1),
        id: z.string().min(1).optional(),
        label: z.string().min(1).optional(),
      })
      .passthrough(),
    goal: z.string().min(1),
    axis: z.string().min(1),
    urgency: z.string().min(1),
    decisionQuestion: z.string().min(1),
    semanticSummary: z.string().min(1),
    materials: z.array(decisionMaterialSchema).min(1),
    recommendedDecision: z.unknown().optional(),
    relevantFacts: z.unknown().optional(),
    risks: z.unknown().optional(),
  })
  .passthrough();

export const decisionActionSchema = z
  .object({
    action: z.string().optional(),
    type: z.string().optional(),
    note: z.string().optional(),
    comment: z.string().optional(),
    condition: z.string().optional(),
    reason: z.string().optional(),
  })
  .passthrough()
  .transform((input, context): DecisionActionInput => {
    const normalized = normalizeDecisionAction(input);

    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported decision action",
        path: ["action"],
      });

      return z.NEVER;
    }

    return normalized;
  });

export type DecisionRequestInput = z.infer<typeof decisionRequestInputSchema>;

export type DecisionStatus = "pending" | "resolved";
export type DecisionResultMailboxStatus =
  | "pending"
  | "picked_up"
  | "acknowledged"
  | "expired";

export type StoredDecisionAction = DecisionActionInput & {
  id?: string;
  pairedDeviceId?: string;
  decidedAt: string;
};

export type StoredDecisionRequest = DecisionRequestInput & {
  id: string;
  requestId: string;
  taskdeckInstanceId?: string;
  taskId?: string;
  sessionId?: string;
  status: DecisionStatus;
  url: string;
  createdAt: string;
  updatedAt: string;
  decision?: StoredDecisionAction;
  rawPayload: DecisionRequestInput;
};

export type DecisionResultMailboxPayload = {
  type: "decision_result";
  decisionRequestId: string;
  decisionActionId: string;
  requestId: string;
  taskId: string | null;
  sessionId: string | null;
  action: {
    action: DecisionActionValue;
    note: string | null;
    type: DecisionActionValue;
    condition: string | null;
    reason: string | null;
    legacyType: LegacyDecisionAction | null;
    decidedAt: string;
  };
  source: DecisionRequestInput["source"];
  goal: string;
  axis: string;
  urgency: string;
};

export type StoredDecisionResultMailboxItem = {
  id: string;
  taskdeckInstanceId: string;
  decisionRequestId: string;
  decisionActionId: string;
  requestId: string;
  taskId?: string;
  sessionId?: string;
  status: DecisionResultMailboxStatus;
  payload: DecisionResultMailboxPayload;
  createdAt: string;
  pickedUpAt?: string;
  acknowledgedAt?: string;
  expiresAt?: string;
};

export type CreateDecisionResultMailboxItemInput = {
  taskdeckInstanceId: string;
  decisionRequestId: string;
  decisionActionId: string;
  requestId: string;
  taskId?: string;
  sessionId?: string;
  payload: DecisionResultMailboxPayload;
  expiresAt?: string;
};

export type ValidatedMobileSession = {
  id: string;
  pairedDeviceId: string;
  taskdeckInstanceId: string;
  expiresAt: string;
};
