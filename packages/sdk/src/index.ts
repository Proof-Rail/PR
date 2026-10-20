import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Transaction,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  xdr,
  Account,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import * as types from '@proofrail/shared';

export * from '@proofrail/shared';

export interface ProofrailConfig {
  rpcUrl: string;
  networkPassphrase: string;
  escrowContractId: string;
  registryContractId?: string;
}

type SignAndSubmit = (tx: Transaction) => Promise<types.TransactionResult>;

// ===== ScVal helpers =====

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return Uint8Array.from(clean.match(/.{2}/g) ?? [], (h) => parseInt(h, 16));
}

function bytesToHex(bytes: Uint8Array | Buffer): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function scAddress(value: string): xdr.ScVal {
  return Address.fromString(value).toScVal();
}

function scOptionAddress(value: string | null): xdr.ScVal {
  return value ? scAddress(value) : xdr.ScVal.scvVoid();
}

function scBytes32(hex: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(hexToBytes(hex)));
}

function scOptionBytes32(hex: string | null): xdr.ScVal {
  return hex ? scBytes32(hex) : xdr.ScVal.scvVoid();
}

function scI128(value: string | number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'i128' });
}

function scU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: 'u32' });
}

function scU64(value: number | bigint): xdr.ScVal {
  return nativeToScVal(BigInt(value), { type: 'u64' });
}

function scString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: 'string' });
}

function scBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: 'bool' });
}

/** Soroban unit-enum variant, e.g. AgreementState::Created -> ScVec[Symbol("Created")] */
function scUnitEnum(variant: string): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant)]);
}

/** Soroban enum variant with named fields, e.g. ReleaseToPayee { amount } */
function scFieldEnum(variant: string, fields: Array<[string, xdr.ScVal]>): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol(variant),
    scStruct(fields),
  ]);
}

/** Soroban struct -> ScMap with lexicographically sorted symbol keys */
function scStruct(fields: Array<[string, xdr.ScVal]>): xdr.ScVal {
  const sorted = [...fields].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return xdr.ScVal.scvMap(
    sorted.map(([key, val]) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val }))
  );
}

function scVerificationPolicy(policy: types.VerificationPolicy): xdr.ScVal {
  return scStruct([
    ['required_evidence_types', xdr.ScVal.scvVec(policy.requiredEvidenceTypes.map((t) => scUnitEnum(evidenceTypeName(t))))],
    ['min_evidence_count', scU32(policy.minEvidenceCount)],
    ['require_all_approved', scBool(policy.requireAllApproved)],
    ['auto_settle_on_approval', scBool(policy.autoSettleOnApproval)],
  ]);
}

function scDisputePolicy(policy: types.DisputePolicy): xdr.ScVal {
  return scStruct([
    ['allowed_initiators', xdr.ScVal.scvVec(policy.allowedInitiators.map(scAddress))],
    ['resolver', policy.resolver ? scAddress(policy.resolver) : xdr.ScVal.scvVoid()],
    ['resolution_deadline', scU64(policy.resolutionDeadline)],
    ['allow_auto_resolution', scBool(policy.allowAutoResolution)],
  ]);
}

function scDeadlines(deadlines: types.Deadlines): xdr.ScVal {
  return scStruct([
    ['funding_deadline', scU64(deadlines.fundingDeadline)],
    ['evidence_deadline', scU64(deadlines.evidenceDeadline)],
    ['verification_deadline', scU64(deadlines.verificationDeadline)],
    ['settlement_deadline', scU64(deadlines.settlementDeadline)],
    ['expiry', scU64(deadlines.expiry)],
  ]);
}

function scDisputeResolution(resolution: types.DisputeResolution): xdr.ScVal {
  switch (resolution.type) {
    case 'ReleaseToPayee':
      return scFieldEnum('ReleaseToPayee', [['amount', scI128(resolution.amount)]]);
    case 'RefundToPayer':
      return scFieldEnum('RefundToPayer', [['amount', scI128(resolution.amount)]]);
    case 'Split':
      return scFieldEnum('Split', [
        ['payee_amount', scI128(resolution.payeeAmount)],
        ['payer_amount', scI128(resolution.payerAmount)],
      ]);
  }
}

// ===== Enum name <-> value mapping =====

const EVIDENCE_TYPE_LABELS: Record<types.EvidenceType, string> = {
  [types.EvidenceType.Document]: 'Document',
  [types.EvidenceType.Image]: 'Image',
  [types.EvidenceType.Video]: 'Video',
  [types.EvidenceType.Audio]: 'Audio',
  [types.EvidenceType.Code]: 'Code',
  [types.EvidenceType.DeliveryProof]: 'DeliveryProof',
  [types.EvidenceType.CompletionReport]: 'CompletionReport',
  [types.EvidenceType.Other]: 'Other',
};

function evidenceTypeName(value: types.EvidenceType): string {
  const label = EVIDENCE_TYPE_LABELS[value];
  if (!label) throw new Error(`Unknown EvidenceType: ${value}`);
  return label;
}

const AGREEMENT_STATE_LABELS: Record<number, types.AgreementState> = {
  0: types.AgreementState.Created,
  1: types.AgreementState.Funded,
  2: types.AgreementState.InProgress,
  3: types.AgreementState.AwaitingVerification,
  4: types.AgreementState.Disputed,
  5: types.AgreementState.Settled,
  6: types.AgreementState.Refunded,
  7: types.AgreementState.Expired,
};

const DISPUTE_STATE_LABELS: Record<number, types.DisputeState> = {
  0: types.DisputeState.Open,
  1: types.DisputeState.UnderReview,
  2: types.DisputeState.Resolved,
};

const VERIFICATION_DECISION_LABELS: Record<number, types.VerificationDecision> = {
  0: types.VerificationDecision.Approved,
  1: types.VerificationDecision.Rejected,
  2: types.VerificationDecision.NeedsRevision,
};

function unitEnumName(value: unknown): string | null {
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
    return value[0];
  }
  if (typeof value === 'string') return value;
  return null;
}

function decodeUnitEnum<T extends number>(value: unknown, _labels: Record<number, T>, kind: string): T {
  const name = unitEnumName(value);
  if (name === null) throw new Error(`Unable to decode ${kind}: ${JSON.stringify(value)}`);
  const numeric = UNIT_ENUM_VALUES[name];
  if (numeric === undefined) throw new Error(`Unknown ${kind} variant: ${name}`);
  return numeric as T;
}

const UNIT_ENUM_VALUES: Record<string, number> = {
  Created: 0, Funded: 1, InProgress: 2, AwaitingVerification: 3, Disputed: 4,
  Settled: 5, Refunded: 6, Expired: 7,
  Open: 0, UnderReview: 1, Resolved: 2,
  Approved: 0, Rejected: 1, NeedsRevision: 2,
};

function decodeEvidenceType(value: unknown): types.EvidenceType {
  const name = unitEnumName(value);
  if (!name) throw new Error(`Unable to decode EvidenceType: ${JSON.stringify(value)}`);
  const known: Record<string, types.EvidenceType> = {
    Document: types.EvidenceType.Document,
    Image: types.EvidenceType.Image,
    Video: types.EvidenceType.Video,
    Audio: types.EvidenceType.Audio,
    Code: types.EvidenceType.Code,
    DeliveryProof: types.EvidenceType.DeliveryProof,
    CompletionReport: types.EvidenceType.CompletionReport,
    Other: types.EvidenceType.Other,
  };
  const decoded = known[name];
  if (decoded === undefined) throw new Error(`Unknown EvidenceType variant: ${name}`);
  return decoded;
}

type RawStruct = Record<string, unknown>;

function asStruct(value: unknown, kind: string): RawStruct {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Unable to decode ${kind}: expected struct`);
  }
  return value as RawStruct;
}

function asBig(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') return BigInt(value);
  throw new Error(`Unable to decode integer: ${JSON.stringify(value)}`);
}

function asHex(value: unknown): string {
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (typeof value === 'string') return value;
  throw new Error(`Unable to decode bytes: ${JSON.stringify(value)}`);
}

function asAddress(value: unknown): string {
  if (typeof value === 'string') return value;
  throw new Error(`Unable to decode address: ${JSON.stringify(value)}`);
}

function asOptionAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null && 'address' in (value as RawStruct)) {
    return asAddress((value as RawStruct).address);
  }
  if (typeof value === 'string') return value;
  return null;
}

function asOptionHex(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return asHex(value);
}

function asOptionBig(value: unknown): bigint | null {
  if (value === null || value === undefined) return null;
  return asBig(value);
}

function decodeVerificationPolicy(value: unknown): types.VerificationPolicy {
  const raw = asStruct(value, 'VerificationPolicy');
  const required = Array.isArray(raw.required_evidence_types) ? raw.required_evidence_types : [];
  return {
    requiredEvidenceTypes: required.map(decodeEvidenceType),
    minEvidenceCount: Number(asBig(raw.min_evidence_count)),
    requireAllApproved: Boolean(raw.require_all_approved),
    autoSettleOnApproval: Boolean(raw.auto_settle_on_approval),
  };
}

function decodeDisputePolicy(value: unknown): types.DisputePolicy {
  const raw = asStruct(value, 'DisputePolicy');
  const allowed = Array.isArray(raw.allowed_initiators) ? raw.allowed_initiators : [];
  return {
    allowedInitiators: allowed.map(asAddress),
    resolver: asOptionAddress(raw.resolver),
    resolutionDeadline: Number(asBig(raw.resolution_deadline)),
    allowAutoResolution: Boolean(raw.allow_auto_resolution),
  };
}

function decodeDeadlines(value: unknown): types.Deadlines {
  const raw = asStruct(value, 'Deadlines');
  return {
    fundingDeadline: Number(asBig(raw.funding_deadline)),
    evidenceDeadline: Number(asBig(raw.evidence_deadline)),
    verificationDeadline: Number(asBig(raw.verification_deadline)),
    settlementDeadline: Number(asBig(raw.settlement_deadline)),
    expiry: Number(asBig(raw.expiry)),
  };
}

function decodeDisputeResolution(value: unknown): types.DisputeResolution | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || typeof value[0] !== 'string') {
    throw new Error(`Unable to decode DisputeResolution: ${JSON.stringify(value)}`);
  }
  const [variant, fields] = value;
  const raw = asStruct(fields, `DisputeResolution.${variant}`);
  switch (variant) {
    case 'ReleaseToPayee':
      return { type: 'ReleaseToPayee', amount: asBig(raw.amount).toString() };
    case 'RefundToPayer':
      return { type: 'RefundToPayer', amount: asBig(raw.amount).toString() };
    case 'Split':
      return {
        type: 'Split',
        payeeAmount: asBig(raw.payee_amount).toString(),
        payerAmount: asBig(raw.payer_amount).toString(),
      };
    default:
      throw new Error(`Unknown DisputeResolution variant: ${variant}`);
  }
}

function decodeAgreementNative(value: unknown): types.Agreement {
  const raw = asStruct(value, 'Agreement');
  return {
    id: asHex(raw.id),
    payer: asAddress(raw.payer),
    payee: asAddress(raw.payee),
    verifier: asOptionAddress(raw.verifier),
    token: asAddress(raw.token),
    amount: asBig(raw.amount).toString(),
    termsHash: asHex(raw.terms_hash),
    verificationPolicy: decodeVerificationPolicy(raw.verification_policy),
    disputePolicy: decodeDisputePolicy(raw.dispute_policy),
    deadlines: decodeDeadlines(raw.deadlines),
    state: decodeUnitEnum(raw.state, AGREEMENT_STATE_LABELS, 'AgreementState'),
    fundedAmount: asBig(raw.funded_amount).toString(),
    createdAt: Number(asBig(raw.created_at)),
    protocolVersion: Number(asBig(raw.protocol_version)),
  };
}

function decodeEvidenceNative(value: unknown): types.Evidence {
  const raw = asStruct(value, 'Evidence');
  return {
    id: asHex(raw.id),
    agreementId: asHex(raw.agreement_id),
    submitter: asAddress(raw.submitter),
    evidenceType: decodeEvidenceType(raw.evidence_type),
    contentHash: asHex(raw.content_hash),
    reference: String(raw.reference ?? ''),
    submittedAt: Number(asBig(raw.submitted_at)),
  };
}

function decodeVerificationNative(value: unknown): types.Verification | null {
  if (value === null || value === undefined) return null;
  const raw = asStruct(value, 'Verification');
  return {
    verifier: asAddress(raw.verifier),
    evidenceId: asHex(raw.evidence_id),
    decision: decodeUnitEnum(raw.decision, VERIFICATION_DECISION_LABELS, 'VerificationDecision'),
    reasonHash: asOptionHex(raw.reason_hash),
    decidedAt: Number(asBig(raw.decided_at)),
  };
}

function decodeDisputeNative(value: unknown): types.Dispute {
  const raw = asStruct(value, 'Dispute');
  return {
    id: asHex(raw.id),
    agreementId: asHex(raw.agreement_id),
    initiator: asAddress(raw.initiator),
    reasonHash: asHex(raw.reason_hash),
    state: decodeUnitEnum(raw.state, DISPUTE_STATE_LABELS, 'DisputeState'),
    resolver: asOptionAddress(raw.resolver),
    resolution: decodeDisputeResolution(raw.resolution),
    createdAt: Number(asBig(raw.created_at)),
    resolvedAt: asOptionBig(raw.resolved_at) === null ? null : Number(asBig(raw.resolved_at)),
  };
}

// ===== SDK =====

export class ProofrailSDK {
  readonly server: SorobanRpc.Server;
  readonly networkPassphrase: string;
  readonly escrowContractId: string;
  readonly registryContractId?: string;
  private readonly escrow: Contract;
  private readonly registry?: Contract;

  constructor(config: ProofrailConfig) {
    this.server = new SorobanRpc.Server(config.rpcUrl);
    this.networkPassphrase = config.networkPassphrase;
    this.escrowContractId = config.escrowContractId;
    this.registryContractId = config.registryContractId;
    this.escrow = new Contract(config.escrowContractId);
    if (config.registryContractId) {
      this.registry = new Contract(config.registryContractId);
    }
  }

  private async buildTx(
    sourceAddress: string,
    contract: Contract,
    fn: string,
    args: xdr.ScVal[]
  ): Promise<Transaction> {
    const account = await this.server.getAccount(sourceAddress);
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(fn, ...args))
      .setTimeout(300)
      .build();
  }

  private async invoke(
    sourceAddress: string,
    fn: string,
    args: xdr.ScVal[],
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    const tx = await this.buildTx(sourceAddress, this.escrow, fn, args);
    const prepared = await this.server.prepareTransaction(tx);
    return signAndSubmit(prepared);
  }

  private async simulate(
    sourceAddress: string,
    fn: string,
    args: xdr.ScVal[]
  ): Promise<unknown> {
    const tx = await this.buildTx(sourceAddress, this.escrow, fn, args);
    const sim = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }
    if (!sim.result?.retval) {
      throw new Error('Simulation returned no result');
    }
    return scValToNative(sim.result.retval);
  }

  /** Submit a signed transaction and wait for confirmation. */
  async submitSigned(tx: Transaction): Promise<types.TransactionResult> {
    const send = await this.server.sendTransaction(tx);
    if (send.status === 'ERROR') {
      return { hash: send.hash, success: false, error: JSON.stringify(send.errorResult ?? send.status) };
    }
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const status = await this.server.getTransaction(send.hash);
      if (status.status === 'SUCCESS') {
        return { hash: send.hash, success: true };
      }
      if (status.status === 'FAILED') {
        return { hash: send.hash, success: false, error: 'Transaction failed on-chain' };
      }
    }
    return { hash: send.hash, success: false, error: 'Transaction timed out waiting for confirmation' };
  }

  // ===== Write functions =====

  async createAgreement(
    params: types.CreateAgreementParams,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(
      params.creator,
      'create_agreement',
      [
        scAddress(params.creator),
        scAddress(params.payer),
        scAddress(params.payee),
        scOptionAddress(params.verifier),
        scAddress(params.token),
        scI128(params.amount),
        scBytes32(params.termsHash),
        scVerificationPolicy(params.verificationPolicy),
        scDisputePolicy(params.disputePolicy),
        scDeadlines(params.deadlines),
      ],
      signAndSubmit
    );
  }

  async fundAgreement(
    payer: string,
    agreementId: string,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(payer, 'fund', [scAddress(payer), scBytes32(agreementId)], signAndSubmit);
  }

  async submitEvidence(
    params: types.SubmitEvidenceParams,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(
      params.submitter,
      'submit_evidence',
      [
        scAddress(params.submitter),
        scBytes32(params.agreementId),
        scUnitEnum(evidenceTypeName(params.evidenceType)),
        scBytes32(params.contentHash),
        scString(params.reference),
      ],
      signAndSubmit
    );
  }

  async verifyEvidence(
    params: types.VerifyEvidenceParams,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    const decisionLabel =
      params.decision === types.VerificationDecision.Approved
        ? 'Approved'
        : params.decision === types.VerificationDecision.Rejected
          ? 'Rejected'
          : 'NeedsRevision';
    return this.invoke(
      params.verifier,
      'verify_evidence',
      [
        scAddress(params.verifier),
        scBytes32(params.evidenceId),
        scUnitEnum(decisionLabel),
        scOptionBytes32(params.reasonHash),
      ],
      signAndSubmit
    );
  }

  async settleAgreement(
    caller: string,
    agreementId: string,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(caller, 'settle', [scAddress(caller), scBytes32(agreementId)], signAndSubmit);
  }

  async refundAgreement(
    payer: string,
    agreementId: string,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(payer, 'refund', [scAddress(payer), scBytes32(agreementId)], signAndSubmit);
  }

  async raiseDispute(
    params: types.RaiseDisputeParams,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(
      params.initiator,
      'raise_dispute',
      [scAddress(params.initiator), scBytes32(params.agreementId), scBytes32(params.reasonHash)],
      signAndSubmit
    );
  }

  async resolveDispute(
    params: types.ResolveDisputeParams,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(
      params.resolver,
      'resolve_dispute',
      [scAddress(params.resolver), scBytes32(params.disputeId), scDisputeResolution(params.resolution)],
      signAndSubmit
    );
  }

  async checkExpiry(
    sourceAddress: string,
    agreementId: string,
    signAndSubmit: SignAndSubmit
  ): Promise<types.TransactionResult> {
    return this.invoke(sourceAddress, 'check_expiry', [scBytes32(agreementId)], signAndSubmit);
  }

  // ===== Read functions (require a funded source address for simulation) =====

  async getAgreement(agreementId: string, sourceAddress: string): Promise<types.Agreement> {
    return decodeAgreementNative(await this.simulate(sourceAddress, 'get_agreement', [scBytes32(agreementId)]));
  }

  async getEvidence(evidenceId: string, sourceAddress: string): Promise<types.Evidence> {
    return decodeEvidenceNative(await this.simulate(sourceAddress, 'get_evidence', [scBytes32(evidenceId)]));
  }

  async getVerification(evidenceId: string, sourceAddress: string): Promise<types.Verification | null> {
    return decodeVerificationNative(
      await this.simulate(sourceAddress, 'get_verification', [scBytes32(evidenceId)])
    );
  }

  async getDispute(disputeId: string, sourceAddress: string): Promise<types.Dispute> {
    return decodeDisputeNative(await this.simulate(sourceAddress, 'get_dispute', [scBytes32(disputeId)]));
  }

  async getAgreementEvidence(agreementId: string, sourceAddress: string): Promise<string[]> {
    const result = await this.simulate(sourceAddress, 'get_agreement_evidence', [scBytes32(agreementId)]);
    if (!Array.isArray(result)) throw new Error('Expected array of evidence ids');
    return result.map(asHex);
  }

  async getAgreementVerifications(agreementId: string, sourceAddress: string): Promise<types.Verification[]> {
    const result = await this.simulate(
      sourceAddress,
      'get_agreement_verifications',
      [scBytes32(agreementId)]
    );
    if (!Array.isArray(result)) throw new Error('Expected array of verifications');
    return result.map((v) => {
      const decoded = decodeVerificationNative(v);
      if (!decoded) throw new Error('Unable to decode verification');
      return decoded;
    });
  }

  async getAgreementState(agreementId: string, sourceAddress: string): Promise<types.AgreementState> {
    const result = await this.simulate(sourceAddress, 'get_agreement_state', [scBytes32(agreementId)]);
    return decodeUnitEnum(result, AGREEMENT_STATE_LABELS, 'AgreementState');
  }

  async isExpired(agreementId: string, sourceAddress: string): Promise<boolean> {
    const result = await this.simulate(sourceAddress, 'is_expired', [scBytes32(agreementId)]);
    return Boolean(result);
  }

  // ===== Utilities =====

  static async hashContentBytes(content: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(content));
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  static async hashContentBrowser(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  static async hashContentNode(content: Buffer): Promise<string> {
    const cryptoModule = await import('crypto');
    return cryptoModule.createHash('sha256').update(content).digest('hex');
  }
}

export function createProofrailSDK(config: ProofrailConfig): ProofrailSDK {
  return new ProofrailSDK(config);
}

export const TESTNET_CONFIG: ProofrailConfig = {
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: Networks.TESTNET,
  escrowContractId: '',
};

export const MAINNET_CONFIG: ProofrailConfig = {
  rpcUrl: 'https://soroban-mainnet.stellar.org',
  networkPassphrase: Networks.PUBLIC,
  escrowContractId: '',
};
