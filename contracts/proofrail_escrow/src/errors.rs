use soroban_sdk::{contracterror, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    // General errors
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidInput = 4,
    NotFound = 5,
    StorageError = 6,

    // Agreement errors
    AgreementNotFound = 100,
    AgreementAlreadyExists = 101,
    InvalidAgreementState = 102,
    InvalidParty = 103,
    InvalidAmount = 104,
    InvalidToken = 105,
    InvalidDeadline = 106,
    DuplicateFunding = 107,
    InsufficientFunding = 108,
    AgreementExpired = 109,
    AgreementAlreadySettled = 110,
    AgreementAlreadyRefunded = 111,
    AgreementInDispute = 112,
    VerificationNotComplete = 113,
    InvalidVerificationPolicy = 114,
    InvalidDisputePolicy = 115,

    // Funding errors
    TransferFailed = 200,
    InsufficientBalance = 201,
    TokenMismatch = 202,

    // Evidence errors
    EvidenceNotFound = 300,
    EvidenceAlreadyExists = 301,
    InvalidEvidenceType = 302,
    InvalidEvidenceReference = 303,
    EvidenceLimitExceeded = 304,
    UnauthorizedEvidenceSubmitter = 305,
    EvidenceHashMismatch = 306,

    // Verification errors
    VerificationNotFound = 400,
    UnauthorizedVerifier = 401,
    InvalidVerificationDecision = 402,
    EvidenceAlreadyVerified = 403,
    VerificationDeadlinePassed = 404,

    // Dispute errors
    DisputeNotFound = 500,
    DisputeAlreadyExists = 501,
    UnauthorizedDisputeInitiator = 502,
    UnauthorizedDisputeResolver = 503,
    DisputeNotOpen = 504,
    InvalidDisputeResolution = 505,
    ResolutionExceedsEscrow = 506,
    DisputeDeadlinePassed = 507,

    // Settlement/Refund errors
    SettlementNotAllowed = 600,
    RefundNotAllowed = 601,
    DuplicateSettlement = 602,
    DuplicateRefund = 603,
    InvalidSettlementAmount = 604,
    InvalidRefundAmount = 605,

    // Arithmetic errors
    Overflow = 700,
    Underflow = 701,
    DivisionByZero = 702,
}

pub type ContractResult<T> = Result<T, ContractError>;