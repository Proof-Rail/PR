import { z } from 'zod';

// ===== Enums =====

export enum AgreementState {
  Created = 0,
  Funded = 1,
  InProgress = 2,
  AwaitingVerification = 3,
  Disputed = 4,
  Settled = 5,
  Refunded = 6,
  Expired = 7,
}

export enum EvidenceType {
  Document = 0,
  Image = 1,
  Video = 2,
  Audio = 3,
  Code = 4,
  DeliveryProof = 5,
  CompletionReport = 6,
  Other = 7,
}

export enum VerificationDecision {
  Approved = 0,
  Rejected = 1,
  NeedsRevision = 2,
}

export enum DisputeState {
  Open = 0,
  UnderReview = 1,
  Resolved = 2,
}

// ===== Zod Schemas =====

export const VerificationPolicySchema = z.object({
  requiredEvidenceTypes: z.array(z.nativeEnum(EvidenceType)).min(1),
  minEvidenceCount: z.number().int().positive(),
  requireAllApproved: z.boolean(),
  autoSettleOnApproval: z.boolean(),
});

export const DisputePolicySchema = z.object({
  allowedInitiators: z.array(z.string().min(1)).min(1),
  resolver: z.string().nullable(),
  resolutionDeadline: z.number().int().positive(),
  allowAutoResolution: z.boolean(),
});

export const DeadlinesSchema = z.object({
  fundingDeadline: z.number().int().positive(),
  evidenceDeadline: z.number().int().positive(),
  verificationDeadline: z.number().int().positive(),
  settlementDeadline: z.number().int().positive(),
  expiry: z.number().int().positive(),
}).refine(
  (data) => data.fundingDeadline < data.evidenceDeadline &&
            data.evidenceDeadline < data.verificationDeadline &&
            data.verificationDeadline < data.settlementDeadline &&
            data.settlementDeadline < data.expiry,
  { message: 'Deadlines must be in chronological order' }
);

export const CreateAgreementParamsSchema = z.object({
  creator: z.string().min(1),
  payer: z.string().min(1),
  payee: z.string().min(1),
  verifier: z.string().nullable(),
  token: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  termsHash: z.string().length(64), // 32 bytes hex
  verificationPolicy: VerificationPolicySchema,
  disputePolicy: DisputePolicySchema,
  deadlines: DeadlinesSchema,
}).refine(
  (data) => data.payer !== data.payee,
  { message: 'Payer and payee must be different', path: ['payee'] }
);

export const SubmitEvidenceParamsSchema = z.object({
  submitter: z.string().min(1),
  agreementId: z.string().length(64),
  evidenceType: z.nativeEnum(EvidenceType),
  contentHash: z.string().length(64),
  reference: z.string().max(512),
});

export const VerifyEvidenceParamsSchema = z.object({
  verifier: z.string().min(1),
  evidenceId: z.string().length(64),
  decision: z.nativeEnum(VerificationDecision),
  reasonHash: z.string().length(64).nullable(),
});

export const RaiseDisputeParamsSchema = z.object({
  initiator: z.string().min(1),
  agreementId: z.string().length(64),
  reasonHash: z.string().length(64),
});

export const DisputeResolutionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ReleaseToPayee'), amount: z.string().regex(/^\d+$/) }),
  z.object({ type: z.literal('RefundToPayer'), amount: z.string().regex(/^\d+$/) }),
  z.object({ 
    type: z.literal('Split'), 
    payeeAmount: z.string().regex(/^\d+$/), 
    payerAmount: z.string().regex(/^\d+$/) 
  }),
]);

export const ResolveDisputeParamsSchema = z.object({
  resolver: z.string().min(1),
  disputeId: z.string().length(64),
  resolution: DisputeResolutionSchema,
});

// ===== Type Exports =====

export type VerificationPolicy = z.infer<typeof VerificationPolicySchema>;
export type DisputePolicy = z.infer<typeof DisputePolicySchema>;
export type Deadlines = z.infer<typeof DeadlinesSchema>;
export type CreateAgreementParams = z.infer<typeof CreateAgreementParamsSchema>;
export type SubmitEvidenceParams = z.infer<typeof SubmitEvidenceParamsSchema>;
export type VerifyEvidenceParams = z.infer<typeof VerifyEvidenceParamsSchema>;
export type RaiseDisputeParams = z.infer<typeof RaiseDisputeParamsSchema>;
export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;
export type ResolveDisputeParams = z.infer<typeof ResolveDisputeParamsSchema>;

// ===== Response Types =====

export interface Agreement {
  id: string;
  payer: string;
  payee: string;
  verifier: string | null;
  token: string;
  amount: string;
  termsHash: string;
  verificationPolicy: VerificationPolicy;
  disputePolicy: DisputePolicy;
  deadlines: Deadlines;
  state: AgreementState;
  fundedAmount: string;
  createdAt: number;
  protocolVersion: number;
}

export interface Evidence {
  id: string;
  agreementId: string;
  submitter: string;
  evidenceType: EvidenceType;
  contentHash: string;
  reference: string;
  submittedAt: number;
}

export interface Verification {
  verifier: string;
  evidenceId: string;
  decision: VerificationDecision;
  reasonHash: string | null;
  decidedAt: number;
}

export interface Dispute {
  id: string;
  agreementId: string;
  initiator: string;
  reasonHash: string;
  state: DisputeState;
  resolver: string | null;
  resolution: DisputeResolution | null;
  createdAt: number;
  resolvedAt: number | null;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}

// ===== Validation Functions =====

export function validateCreateAgreement(params: unknown): CreateAgreementParams {
  return CreateAgreementParamsSchema.parse(params);
}

export function validateSubmitEvidence(params: unknown): SubmitEvidenceParams {
  return SubmitEvidenceParamsSchema.parse(params);
}

export function validateVerifyEvidence(params: unknown): VerifyEvidenceParams {
  return VerifyEvidenceParamsSchema.parse(params);
}

export function validateRaiseDispute(params: unknown): RaiseDisputeParams {
  return RaiseDisputeParamsSchema.parse(params);
}

export function validateResolveDispute(params: unknown): ResolveDisputeParams {
  return ResolveDisputeParamsSchema.parse(params);
}

export function validateDeadlines(deadlines: unknown): Deadlines {
  return DeadlinesSchema.parse(deadlines);
}

// ===== Utility Functions =====

export function isTerminalState(state: AgreementState): boolean {
  return [
    AgreementState.Settled,
    AgreementState.Refunded,
    AgreementState.Expired,
  ].includes(state);
}

export function canTransitionFrom(from: AgreementState, to: AgreementState): boolean {
  const transitions: Record<AgreementState, AgreementState[]> = {
    [AgreementState.Created]: [AgreementState.Funded, AgreementState.Expired],
    [AgreementState.Funded]: [AgreementState.InProgress, AgreementState.Refunded, AgreementState.Disputed, AgreementState.Expired],
    [AgreementState.InProgress]: [AgreementState.AwaitingVerification, AgreementState.Disputed, AgreementState.Refunded, AgreementState.Expired],
    [AgreementState.AwaitingVerification]: [AgreementState.Settled, AgreementState.Disputed, AgreementState.Refunded, AgreementState.Expired],
    [AgreementState.Disputed]: [AgreementState.Settled, AgreementState.Refunded],
    [AgreementState.Settled]: [],
    [AgreementState.Refunded]: [],
    [AgreementState.Expired]: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function agreementStateToString(state: AgreementState): string {
  return AgreementState[state];
}

export function evidenceTypeToString(type: EvidenceType): string {
  return EvidenceType[type];
}

export function verificationDecisionToString(decision: VerificationDecision): string {
  return VerificationDecision[decision];
}

export function disputeStateToString(state: DisputeState): string {
  return DisputeState[state];
}