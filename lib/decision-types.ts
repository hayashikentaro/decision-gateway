import { z } from "zod";

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

export const decisionActionSchema = z.object({
  type: z.enum([
    "accept",
    "conditional_accept",
    "suspend",
    "reject",
    "insufficient_materials",
  ]),
  condition: z.string().optional(),
  reason: z.string().optional(),
});

export type DecisionRequestInput = z.infer<typeof decisionRequestInputSchema>;
export type DecisionActionInput = z.infer<typeof decisionActionSchema>;

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
    type: DecisionActionInput["type"];
    condition: string | null;
    reason: string | null;
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
