use soroban_sdk::{Address, BytesN, Env, Symbol, symbol_short, Vec};
use crate::types::{Agreement, Evidence, VerificationDecision, DisputeResolution, Dispute};

// ── Topic symbols ────────────────────────────────────────────────────────────
// Every event has a two-element topic Vec: [contract_symbol, event_kind_symbol].
// Data is the payload struct serialised as a second argument to publish().

fn contract_sym(env: &Env) -> Symbol {
    symbol_short!("proofrail")
}

// ── Agreement events ─────────────────────────────────────────────────────────

pub fn emit_agreement_created(env: &Env, agreement: &Agreement) {
    let topics = (symbol_short!("proofrail"), symbol_short!("agr_crt"));
    env.events().publish(
        topics,
        (
            agreement.id.clone(),
            agreement.payer.clone(),   // creator is passed as payer (consistent with lib.rs comment)
            agreement.payee.clone(),
            agreement.token.clone(),
            agreement.amount,
        ),
    );
}

pub fn emit_agreement_funded(
    env: &Env,
    agreement_id: &BytesN<32>,
    payer: &Address,
    amount: &i128,
) {
    let topics = (symbol_short!("proofrail"), symbol_short!("agr_fund"));
    env.events().publish(topics, (agreement_id.clone(), payer.clone(), *amount));
}

pub fn emit_agreement_settled(
    env: &Env,
    agreement_id: &BytesN<32>,
    payee: &Address,
    amount: &i128,
) {
    let topics = (symbol_short!("proofrail"), symbol_short!("agr_stl"));
    env.events().publish(topics, (agreement_id.clone(), payee.clone(), *amount));
}

pub fn emit_agreement_refunded(
    env: &Env,
    agreement_id: &BytesN<32>,
    payer: &Address,
    amount: &i128,
) {
    let topics = (symbol_short!("proofrail"), symbol_short!("agr_ref"));
    env.events().publish(topics, (agreement_id.clone(), payer.clone(), *amount));
}

pub fn emit_agreement_expired(env: &Env, agreement_id: &BytesN<32>) {
    let topics = (symbol_short!("proofrail"), symbol_short!("agr_exp"));
    env.events().publish(topics, (agreement_id.clone(),));
}

// ── Evidence events ───────────────────────────────────────────────────────────

pub fn emit_evidence_submitted(env: &Env, evidence: &Evidence) {
    let topics = (symbol_short!("proofrail"), symbol_short!("evd_sub"));
    env.events().publish(
        topics,
        (
            evidence.id.clone(),
            evidence.agreement_id.clone(),
            evidence.submitter.clone(),
            evidence.content_hash.clone(),
        ),
    );
}

pub fn emit_evidence_verified(
    env: &Env,
    evidence_id: &BytesN<32>,
    verifier: &Address,
    decision: &VerificationDecision,
) {
    // Encode decision as a u32 discriminant to keep the payload serialisable.
    let decision_u32: u32 = match decision {
        VerificationDecision::Approved      => 0,
        VerificationDecision::Rejected      => 1,
        VerificationDecision::NeedsRevision => 2,
    };
    let topics = (symbol_short!("proofrail"), symbol_short!("evd_ver"));
    env.events().publish(topics, (evidence_id.clone(), verifier.clone(), decision_u32));
}

// ── Dispute events ────────────────────────────────────────────────────────────

pub fn emit_dispute_raised(env: &Env, dispute: &Dispute) {
    let topics = (symbol_short!("proofrail"), symbol_short!("dsp_rsd"));
    env.events().publish(
        topics,
        (
            dispute.id.clone(),
            dispute.agreement_id.clone(),
            dispute.initiator.clone(),
            dispute.reason_hash.clone(),
        ),
    );
}

/// `resolver` is the caller who invoked `resolve_dispute`, not the contract.
pub fn emit_dispute_resolved(
    env: &Env,
    dispute_id: &BytesN<32>,
    resolver: &Address,
    resolution: &DisputeResolution,
) {
    let (resolution_type, payee_amount, payer_amount): (u32, i128, i128) = match resolution {
        DisputeResolution::ReleaseToPayee { amount }               => (0, *amount, 0),
        DisputeResolution::RefundToPayer  { amount }               => (1, 0, *amount),
        DisputeResolution::Split { payee_amount, payer_amount }    => (2, *payee_amount, *payer_amount),
    };

    let topics = (symbol_short!("proofrail"), symbol_short!("dsp_res"));
    env.events().publish(
        topics,
        (
            dispute_id.clone(),
            resolver.clone(),
            resolution_type,
            payee_amount,
            payer_amount,
        ),
    );
}
