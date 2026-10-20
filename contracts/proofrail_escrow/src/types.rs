use soroban_sdk::{contracttype, Address, BytesN, String, Vec, Map};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementState {
    Created,
    Funded,
    InProgress,
    AwaitingVerification,
    Disputed,
    Settled,
    Refunded,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EvidenceType {
    Document,
    Image,
    Video,
    Audio,
    Code,
    DeliveryProof,
    CompletionReport,
    Other,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VerificationDecision {
    Approved,
    Rejected,
    NeedsRevision,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeState {
    Open,
    UnderReview,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeResolution {
    ReleaseToPayee { amount: i128 },
    RefundToPayer { amount: i128 },
    Split { payee_amount: i128, payer_amount: i128 },
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationPolicy {
    pub required_evidence_types: Vec<EvidenceType>,
    pub min_evidence_count: u32,
    pub require_all_approved: bool,
    pub auto_settle_on_approval: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DisputePolicy {
    pub allowed_initiators: Vec<Address>,
    pub resolver: Option<Address>,
    pub resolution_deadline: u64,
    pub allow_auto_resolution: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deadlines {
    pub funding_deadline: u64,
    pub evidence_deadline: u64,
    pub verification_deadline: u64,
    pub settlement_deadline: u64,
    pub expiry: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Agreement {
    pub id: BytesN<32>,
    pub payer: Address,
    pub payee: Address,
    pub verifier: Option<Address>,
    pub token: Address,
    pub amount: i128,
    pub terms_hash: BytesN<32>,
    pub verification_policy: VerificationPolicy,
    pub dispute_policy: DisputePolicy,
    pub deadlines: Deadlines,
    pub state: AgreementState,
    pub funded_amount: i128,
    pub created_at: u64,
    pub protocol_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Evidence {
    pub id: BytesN<32>,
    pub agreement_id: BytesN<32>,
    pub submitter: Address,
    pub evidence_type: EvidenceType,
    pub content_hash: BytesN<32>,
    pub reference: String,
    pub submitted_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Verification {
    pub verifier: Address,
    pub evidence_id: BytesN<32>,
    pub decision: VerificationDecision,
    pub reason_hash: Option<BytesN<32>>,
    pub decided_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub id: BytesN<32>,
    pub agreement_id: BytesN<32>,
    pub initiator: Address,
    pub reason_hash: BytesN<32>,
    pub state: DisputeState,
    pub resolver: Option<Address>,
    pub resolution: Option<DisputeResolution>,
    pub created_at: u64,
    pub resolved_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    Admin,
    ProtocolVersion,
    Agreement(BytesN<32>),
    Evidence(BytesN<32>),
    Verification(BytesN<32>),
    Dispute(BytesN<32>),
    AgreementEvidenceList(BytesN<32>),
    AgreementVerifications(BytesN<32>),
}