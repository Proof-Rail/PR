use soroban_sdk::{Env, Address, String};
use crate::types::*;
use crate::errors::{ContractError, ContractResult};

pub fn validate_create_agreement(
    env: &Env,
    creator: &Address,
    payer: &Address,
    payee: &Address,
    verifier: &Option<Address>,
    token: &Address,
    amount: i128,
    verification_policy: &VerificationPolicy,
    dispute_policy: &DisputePolicy,
    deadlines: &Deadlines,
) -> ContractResult<()> {
    // Payer and payee must be distinct parties.
    if payer == payee {
        return Err(ContractError::InvalidParty);
    }

    // Amount must be positive.
    if amount <= 0 {
        return Err(ContractError::InvalidAmount);
    }

    // Deadlines must be strictly increasing and all in the future.
    let now = env.ledger().timestamp();
    if deadlines.funding_deadline <= now {
        return Err(ContractError::InvalidDeadline);
    }
    if deadlines.evidence_deadline <= deadlines.funding_deadline {
        return Err(ContractError::InvalidDeadline);
    }
    if deadlines.verification_deadline <= deadlines.evidence_deadline {
        return Err(ContractError::InvalidDeadline);
    }
    if deadlines.settlement_deadline <= deadlines.verification_deadline {
        return Err(ContractError::InvalidDeadline);
    }
    if deadlines.expiry <= deadlines.settlement_deadline {
        return Err(ContractError::InvalidDeadline);
    }

    // Verification policy must require at least one evidence type and a positive count.
    if verification_policy.min_evidence_count == 0 {
        return Err(ContractError::InvalidVerificationPolicy);
    }
    if verification_policy.required_evidence_types.len() == 0 {
        return Err(ContractError::InvalidVerificationPolicy);
    }

    // Dispute policy must name at least one party who may raise a dispute, and
    // must either name a resolver or permit auto-resolution.
    if dispute_policy.allowed_initiators.len() == 0 {
        return Err(ContractError::InvalidDisputePolicy);
    }
    if dispute_policy.resolver.is_none() && !dispute_policy.allow_auto_resolution {
        return Err(ContractError::InvalidDisputePolicy);
    }
    // resolution_deadline must fall before or on the overall expiry so that
    // disputes can actually be raised and resolved while the agreement is live.
    // Previously this was checked as > expiry (backwards); corrected below.
    if dispute_policy.resolution_deadline > deadlines.expiry {
        return Err(ContractError::InvalidDisputePolicy);
    }

    // Creator must be one of the named parties (or the verifier if one is set).
    let creator_is_party = creator == payer || creator == payee;
    let creator_is_verifier = verifier.as_ref().map_or(false, |v| creator == v);
    if !creator_is_party && !creator_is_verifier {
        return Err(ContractError::Unauthorized);
    }

    Ok(())
}

pub fn validate_fund(
    env: &Env,
    payer: &Address,
    agreement: &Agreement,
) -> ContractResult<()> {
    // Only the designated payer may fund.
    if payer != &agreement.payer {
        return Err(ContractError::Unauthorized);
    }

    // Agreement must be in the Created state.
    if agreement.state != AgreementState::Created {
        return Err(ContractError::InvalidAgreementState);
    }

    // Funding deadline must not have passed.
    let now = env.ledger().timestamp();
    if now > agreement.deadlines.funding_deadline {
        return Err(ContractError::AgreementExpired);
    }

    // Must not have already been funded (defensive; state check above covers this).
    if agreement.funded_amount > 0 {
        return Err(ContractError::DuplicateFunding);
    }

    Ok(())
}

pub fn validate_evidence_submission(
    env: &Env,
    submitter: &Address,
    agreement: &Agreement,
    reference: &String,
) -> ContractResult<()> {
    // Evidence can only be submitted while the agreement is active.
    match agreement.state {
        AgreementState::Funded | AgreementState::InProgress => {}
        _ => return Err(ContractError::InvalidAgreementState),
    }

    // Evidence deadline must not have passed.
    let now = env.ledger().timestamp();
    if now > agreement.deadlines.evidence_deadline {
        return Err(ContractError::AgreementExpired);
    }

    // Submitter must be one of the named parties.
    let authorized = submitter == &agreement.payer
        || submitter == &agreement.payee
        || agreement.verifier.as_ref() == Some(submitter);

    if !authorized {
        return Err(ContractError::UnauthorizedEvidenceSubmitter);
    }

    // Reference string must not exceed the on-chain length limit.
    if reference.len() > 512 {
        return Err(ContractError::InvalidEvidenceReference);
    }

    // Enforce the global evidence-per-agreement cap.
    let evidence_list = crate::storage::get_agreement_evidence_list(env, &agreement.id);
    if evidence_list.len() >= 50 {
        return Err(ContractError::EvidenceLimitExceeded);
    }

    Ok(())
}

pub fn validate_verification(
    env: &Env,
    verifier: &Address,
    agreement: &Agreement,
    evidence: &Evidence,
    _decision: &VerificationDecision,
) -> ContractResult<()> {
    // Only the designated verifier may verify.
    if agreement.verifier.as_ref() != Some(verifier) {
        return Err(ContractError::UnauthorizedVerifier);
    }

    // The evidence must belong to this agreement.
    if evidence.agreement_id != agreement.id {
        return Err(ContractError::EvidenceNotFound);
    }

    // Agreement must be in a state that allows verification.
    if agreement.state != AgreementState::InProgress
        && agreement.state != AgreementState::AwaitingVerification
    {
        return Err(ContractError::InvalidAgreementState);
    }

    // Verification deadline must not have passed.
    let now = env.ledger().timestamp();
    if now > agreement.deadlines.verification_deadline {
        return Err(ContractError::VerificationDeadlinePassed);
    }

    // Each piece of evidence may only be verified once.
    if crate::storage::get_verification(env, &evidence.id).is_some() {
        return Err(ContractError::EvidenceAlreadyVerified);
    }

    Ok(())
}

pub fn validate_settlement(
    env: &Env,
    caller: &Address,
    agreement: &Agreement,
) -> ContractResult<()> {
    // Settlement is only valid from the AwaitingVerification state.
    // NOTE: Disputed is already excluded here — the previous implementation had
    // a redundant second check for Disputed that could never be reached.
    if agreement.state != AgreementState::AwaitingVerification {
        return Err(ContractError::SettlementNotAllowed);
    }

    // The full escrow amount must be present.
    if agreement.funded_amount != agreement.amount {
        return Err(ContractError::InsufficientFunding);
    }

    // All verification requirements must be satisfied.
    if !check_verification_complete(env, agreement) {
        return Err(ContractError::VerificationNotComplete);
    }

    // Settlement deadline must not have passed.
    let now = env.ledger().timestamp();
    if now > agreement.deadlines.settlement_deadline {
        return Err(ContractError::AgreementExpired);
    }

    // Only the payee or the verifier (for auto-settle) may trigger settlement.
    if caller != &agreement.payee && agreement.verifier.as_ref() != Some(caller) {
        return Err(ContractError::Unauthorized);
    }

    Ok(())
}

pub fn validate_refund(
    env: &Env,
    payer: &Address,
    agreement: &Agreement,
) -> ContractResult<()> {
    // Only the designated payer may request a refund.
    if payer != &agreement.payer {
        return Err(ContractError::Unauthorized);
    }

    // Refund is only permitted from active (non-terminal, non-disputed) states.
    match agreement.state {
        AgreementState::Funded
        | AgreementState::InProgress
        | AgreementState::AwaitingVerification => {}
        AgreementState::Disputed => return Err(ContractError::AgreementInDispute),
        _ => return Err(ContractError::RefundNotAllowed),
    }

    // There must be funds to return.
    if agreement.funded_amount == 0 {
        return Err(ContractError::InsufficientFunding);
    }

    Ok(())
}

pub fn validate_dispute_creation(
    env: &Env,
    initiator: &Address,
    agreement: &Agreement,
) -> ContractResult<()> {
    // Disputes cannot be raised on terminal or already-disputed agreements.
    match agreement.state {
        AgreementState::Settled
        | AgreementState::Refunded
        | AgreementState::Expired
        | AgreementState::Disputed => return Err(ContractError::InvalidAgreementState),
        _ => {}
    }

    // The initiator must be in the allow-list.
    let allowed = agreement
        .dispute_policy
        .allowed_initiators
        .iter()
        .any(|addr| addr == *initiator);

    if !allowed {
        return Err(ContractError::UnauthorizedDisputeInitiator);
    }

    // The dispute resolution window must not have closed.
    let now = env.ledger().timestamp();
    if now > agreement.dispute_policy.resolution_deadline {
        return Err(ContractError::DisputeDeadlinePassed);
    }

    Ok(())
}

pub fn validate_dispute_resolution(
    env: &Env,
    resolver: &Address,
    dispute: &Dispute,
    agreement: &Agreement,
    resolution: &DisputeResolution,
) -> ContractResult<()> {
    // Only the named resolver may resolve.
    if dispute.resolver.as_ref() != Some(resolver) {
        return Err(ContractError::UnauthorizedDisputeResolver);
    }

    // The dispute must still be open.
    if dispute.state != DisputeState::Open {
        return Err(ContractError::DisputeNotOpen);
    }

    // The resolution window must not have closed.
    let now = env.ledger().timestamp();
    if now > agreement.dispute_policy.resolution_deadline {
        return Err(ContractError::DisputeDeadlinePassed);
    }

    // The total payout must not exceed the escrowed amount.
    let total_resolution: i128 = match resolution {
        DisputeResolution::ReleaseToPayee { amount } => *amount,
        DisputeResolution::RefundToPayer  { amount } => *amount,
        DisputeResolution::Split { payee_amount, payer_amount } => {
            payee_amount
                .checked_add(*payer_amount)
                .ok_or(ContractError::Overflow)?
        }
    };

    if total_resolution > agreement.funded_amount {
        return Err(ContractError::ResolutionExceedsEscrow);
    }

    Ok(())
}

pub fn validate_expiry(env: &Env, agreement: &Agreement) -> ContractResult<()> {
    // Can only process expiry once the expiry timestamp has passed.
    let now = env.ledger().timestamp();
    if now <= agreement.deadlines.expiry {
        return Err(ContractError::InvalidAgreementState);
    }
    Ok(())
}

// ── Internal helper ───────────────────────────────────────────────────────────

/// Returns `true` when all verification requirements defined in the agreement's
/// `VerificationPolicy` have been satisfied by approved verifications.
pub fn check_verification_complete(env: &Env, agreement: &Agreement) -> bool {
    let evidence_list = crate::storage::get_agreement_evidence_list(env, &agreement.id);

    let mut approved_count: u32 = 0;
    let mut approved_types: soroban_sdk::Vec<EvidenceType> = soroban_sdk::Vec::new(env);

    for evidence_id in evidence_list.iter() {
        if let Ok(evidence) = crate::storage::get_evidence(env, &evidence_id) {
            if let Some(verification) = crate::storage::get_verification(env, &evidence_id) {
                if verification.decision == VerificationDecision::Approved {
                    approved_count += 1;
                    // Record the type only once per unique type.
                    if !approved_types
                        .iter()
                        .any(|t: EvidenceType| t == evidence.evidence_type)
                    {
                        approved_types.push_back(evidence.evidence_type);
                    }
                }
            }
        }
    }

    // Minimum approved count must be reached.
    if approved_count < agreement.verification_policy.min_evidence_count {
        return false;
    }

    // Every required evidence type must have at least one approved submission.
    for required_type in agreement.verification_policy.required_evidence_types.iter() {
        if !approved_types
            .iter()
            .any(|t: EvidenceType| t == required_type)
        {
            return false;
        }
    }

    // If require_all_approved is set, no rejections are permitted at all.
    if agreement.verification_policy.require_all_approved {
        for evidence_id in evidence_list.iter() {
            if let Some(verification) =
                crate::storage::get_verification(env, &evidence_id)
            {
                if verification.decision == VerificationDecision::Rejected {
                    return false;
                }
            }
        }
    }

    true
}
