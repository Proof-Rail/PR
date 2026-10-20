#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, String, Vec};
use soroban_sdk::token::TokenClient;

mod types;
mod events;
mod errors;
mod storage;
mod validation;

use types::*;
use events::*;
use errors::{ContractError, ContractResult};
use storage::*;
use validation::*;

const PROTOCOL_VERSION: u32 = 1;

#[contract]
pub struct ProofrailEscrow;

#[contractimpl]
impl ProofrailEscrow {
    // ── Initialisation ────────────────────────────────────────────────────────

    /// Initialise the contract. Must be called once by the deployer.
    pub fn initialize(env: Env, admin: Address) -> ContractResult<()> {
        admin.require_auth();
        // Prevent re-initialisation.
        if env.storage().instance().has(&StorageKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        set_admin(&env, &admin);
        set_protocol_version(&env, PROTOCOL_VERSION);
        Ok(())
    }

    /// Return the protocol version stored on-chain.
    pub fn protocol_version(env: Env) -> u32 {
        get_protocol_version(&env)
    }

    // ── Agreement lifecycle ───────────────────────────────────────────────────

    /// Create a new agreement and return its on-chain ID.
    pub fn create_agreement(
        env: Env,
        creator: Address,
        payer: Address,
        payee: Address,
        verifier: Option<Address>,
        token: Address,
        amount: i128,
        terms_hash: BytesN<32>,
        verification_policy: VerificationPolicy,
        dispute_policy: DisputePolicy,
        deadlines: Deadlines,
    ) -> ContractResult<BytesN<32>> {
        creator.require_auth();

        validate_create_agreement(
            &env, &creator, &payer, &payee, &verifier, &token, amount,
            &verification_policy, &dispute_policy, &deadlines,
        )?;

        let agreement_id = generate_agreement_id(
            &env, &creator, &payer, &payee, &token, amount,
        );

        let agreement = Agreement {
            id: agreement_id.clone(),
            payer: payer.clone(),
            payee: payee.clone(),
            verifier,
            token: token.clone(),
            amount,
            terms_hash,
            verification_policy,
            dispute_policy,
            deadlines,
            state: AgreementState::Created,
            funded_amount: 0,
            created_at: env.ledger().timestamp(),
            protocol_version: PROTOCOL_VERSION,
        };

        store_agreement(&env, &agreement);
        emit_agreement_created(&env, &agreement);

        Ok(agreement_id)
    }

    /// Fund the agreement. Only the designated payer may call this.
    pub fn fund(env: Env, payer: Address, agreement_id: BytesN<32>) -> ContractResult<()> {
        payer.require_auth();

        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_fund(&env, &payer, &agreement)?;

        TokenClient::new(&env, &agreement.token)
            .transfer(&payer, &env.current_contract_address(), &agreement.amount);

        agreement.funded_amount = agreement.amount;
        agreement.state = AgreementState::Funded;
        store_agreement(&env, &agreement);

        emit_agreement_funded(&env, &agreement_id, &payer, &agreement.amount);
        Ok(())
    }

    /// Submit evidence for an agreement and return the new evidence ID.
    pub fn submit_evidence(
        env: Env,
        submitter: Address,
        agreement_id: BytesN<32>,
        evidence_type: EvidenceType,
        content_hash: BytesN<32>,
        reference: String,
    ) -> ContractResult<BytesN<32>> {
        submitter.require_auth();

        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_evidence_submission(&env, &submitter, &agreement, &reference)?;

        let evidence_id = generate_evidence_id(&env, &agreement_id, &submitter, &content_hash);
        let evidence = Evidence {
            id: evidence_id.clone(),
            agreement_id: agreement_id.clone(),
            submitter: submitter.clone(),
            evidence_type,
            content_hash,
            reference,
            submitted_at: env.ledger().timestamp(),
        };

        store_evidence(&env, &evidence);
        update_agreement_evidence_list(&env, &agreement_id, &evidence_id);

        // Transition from Funded → InProgress on first evidence submission.
        if agreement.state == AgreementState::Funded {
            agreement.state = AgreementState::InProgress;
            store_agreement(&env, &agreement);
        }

        emit_evidence_submitted(&env, &evidence);
        Ok(evidence_id)
    }

    /// Verify a piece of evidence. Only the designated verifier may call this.
    pub fn verify_evidence(
        env: Env,
        verifier: Address,
        evidence_id: BytesN<32>,
        decision: VerificationDecision,
        reason_hash: Option<BytesN<32>>,
    ) -> ContractResult<()> {
        verifier.require_auth();

        let evidence = get_evidence(&env, &evidence_id)?;
        let mut agreement = get_agreement(&env, &evidence.agreement_id)?;

        validate_verification(&env, &verifier, &agreement, &evidence, &decision)?;

        let verification = Verification {
            verifier: verifier.clone(),
            evidence_id: evidence_id.clone(),
            decision: decision.clone(),
            reason_hash,
            decided_at: env.ledger().timestamp(),
        };

        store_verification(&env, &verification);
        // Keep the per-agreement verification list in sync (was missing before).
        update_agreement_verifications(&env, &evidence.agreement_id, &verification);

        // Transition to AwaitingVerification when all evidence requirements are met.
        if check_verification_complete(&env, &agreement) {
            agreement.state = AgreementState::AwaitingVerification;
            store_agreement(&env, &agreement);
        }

        emit_evidence_verified(&env, &evidence_id, &verifier, &decision);
        Ok(())
    }

    /// Settle the agreement, releasing escrowed funds to the payee.
    pub fn settle(env: Env, caller: Address, agreement_id: BytesN<32>) -> ContractResult<()> {
        caller.require_auth();

        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_settlement(&env, &caller, &agreement)?;

        TokenClient::new(&env, &agreement.token)
            .transfer(
                &env.current_contract_address(),
                &agreement.payee,
                &agreement.funded_amount,
            );

        agreement.state = AgreementState::Settled;
        store_agreement(&env, &agreement);

        emit_agreement_settled(&env, &agreement_id, &agreement.payee, &agreement.funded_amount);
        Ok(())
    }

    /// Refund the escrowed amount back to the payer under eligible conditions.
    pub fn refund(env: Env, payer: Address, agreement_id: BytesN<32>) -> ContractResult<()> {
        payer.require_auth();

        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_refund(&env, &payer, &agreement)?;

        TokenClient::new(&env, &agreement.token)
            .transfer(
                &env.current_contract_address(),
                &payer,
                &agreement.funded_amount,
            );

        agreement.state = AgreementState::Refunded;
        store_agreement(&env, &agreement);

        emit_agreement_refunded(&env, &agreement_id, &payer, &agreement.funded_amount);
        Ok(())
    }

    /// Raise a dispute against a funded agreement. Returns the dispute ID.
    pub fn raise_dispute(
        env: Env,
        initiator: Address,
        agreement_id: BytesN<32>,
        reason_hash: BytesN<32>,
    ) -> ContractResult<BytesN<32>> {
        initiator.require_auth();

        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_dispute_creation(&env, &initiator, &agreement)?;

        let dispute_id = generate_dispute_id(&env, &agreement_id, &initiator, &reason_hash);
        let dispute = Dispute {
            id: dispute_id.clone(),
            agreement_id: agreement_id.clone(),
            initiator: initiator.clone(),
            reason_hash,
            state: DisputeState::Open,
            resolver: agreement.dispute_policy.resolver.clone(),
            resolution: None,
            created_at: env.ledger().timestamp(),
            resolved_at: None,
        };

        store_dispute(&env, &dispute);
        agreement.state = AgreementState::Disputed;
        store_agreement(&env, &agreement);

        emit_dispute_raised(&env, &dispute);
        Ok(dispute_id)
    }

    /// Resolve an open dispute. Only the designated resolver may call this.
    pub fn resolve_dispute(
        env: Env,
        resolver: Address,
        dispute_id: BytesN<32>,
        resolution: DisputeResolution,
    ) -> ContractResult<()> {
        resolver.require_auth();

        let mut dispute = get_dispute(&env, &dispute_id)?;
        let mut agreement = get_agreement(&env, &dispute.agreement_id)?;

        validate_dispute_resolution(&env, &resolver, &dispute, &agreement, &resolution)?;

        let token_client = TokenClient::new(&env, &agreement.token);
        match &resolution {
            DisputeResolution::ReleaseToPayee { amount } => {
                token_client.transfer(
                    &env.current_contract_address(),
                    &agreement.payee,
                    amount,
                );
            }
            DisputeResolution::RefundToPayer { amount } => {
                token_client.transfer(
                    &env.current_contract_address(),
                    &agreement.payer,
                    amount,
                );
            }
            DisputeResolution::Split { payee_amount, payer_amount } => {
                token_client.transfer(
                    &env.current_contract_address(),
                    &agreement.payee,
                    payee_amount,
                );
                token_client.transfer(
                    &env.current_contract_address(),
                    &agreement.payer,
                    payer_amount,
                );
            }
        }

        dispute.state = DisputeState::Resolved;
        dispute.resolution = Some(resolution.clone());
        dispute.resolved_at = Some(env.ledger().timestamp());
        store_dispute(&env, &dispute);

        agreement.state = AgreementState::Settled;
        store_agreement(&env, &agreement);

        // Pass the actual resolver address, not the contract address.
        emit_dispute_resolved(&env, &dispute_id, &resolver, &resolution);
        Ok(())
    }

    /// Check whether an agreement has expired and handle it accordingly.
    /// If the agreement holds funds it refunds the payer; otherwise it marks it
    /// Expired.  Emits only the relevant event — never both.
    pub fn check_expiry(env: Env, agreement_id: BytesN<32>) -> ContractResult<()> {
        let mut agreement = get_agreement(&env, &agreement_id)?;
        validate_expiry(&env, &agreement)?;

        if agreement.funded_amount > 0
            && agreement.state != AgreementState::Settled
            && agreement.state != AgreementState::Refunded
            && agreement.state != AgreementState::Disputed
        {
            // Funds are still locked — refund the payer.
            TokenClient::new(&env, &agreement.token)
                .transfer(
                    &env.current_contract_address(),
                    &agreement.payer,
                    &agreement.funded_amount,
                );

            agreement.state = AgreementState::Refunded;
            store_agreement(&env, &agreement);

            // Emit only the refund event; the agreement was not simply abandoned.
            emit_agreement_refunded(
                &env,
                &agreement_id,
                &agreement.payer,
                &agreement.funded_amount,
            );
        } else {
            // No funds to return — mark as expired.
            agreement.state = AgreementState::Expired;
            store_agreement(&env, &agreement);

            // Emit only the expired event.
            emit_agreement_expired(&env, &agreement_id);
        }

        Ok(())
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /// Fetch an agreement by ID. Panics if not found (consistent with Soroban
    /// read-only view convention; callers should check existence first).
    pub fn get_agreement(env: Env, agreement_id: BytesN<32>) -> Agreement {
        storage::get_agreement(&env, &agreement_id)
            .unwrap_or_else(|_| panic_with_error!(&env, ContractError::AgreementNotFound))
    }

    /// Fetch a piece of evidence by ID.
    pub fn get_evidence(env: Env, evidence_id: BytesN<32>) -> Evidence {
        storage::get_evidence(&env, &evidence_id)
            .unwrap_or_else(|_| panic_with_error!(&env, ContractError::EvidenceNotFound))
    }

    /// Fetch the verification record for a given evidence ID, if it exists.
    pub fn get_verification(env: Env, evidence_id: BytesN<32>) -> Option<Verification> {
        storage::get_verification(&env, &evidence_id)
    }

    /// Fetch a dispute by ID.
    pub fn get_dispute(env: Env, dispute_id: BytesN<32>) -> Dispute {
        storage::get_dispute(&env, &dispute_id)
            .unwrap_or_else(|_| panic_with_error!(&env, ContractError::DisputeNotFound))
    }

    /// Return all evidence IDs attached to an agreement.
    pub fn get_agreement_evidence(
        env: Env,
        agreement_id: BytesN<32>,
    ) -> Vec<BytesN<32>> {
        storage::get_agreement_evidence_list(&env, &agreement_id)
    }

    /// Return all verification records attached to an agreement.
    pub fn get_agreement_verifications(
        env: Env,
        agreement_id: BytesN<32>,
    ) -> Vec<Verification> {
        storage::get_agreement_verifications(&env, &agreement_id)
    }

    /// Return the current state of an agreement.
    pub fn get_agreement_state(env: Env, agreement_id: BytesN<32>) -> AgreementState {
        storage::get_agreement(&env, &agreement_id)
            .unwrap_or_else(|_| panic_with_error!(&env, ContractError::AgreementNotFound))
            .state
    }

    /// Return `true` if the agreement's expiry timestamp has passed.
    pub fn is_expired(env: Env, agreement_id: BytesN<32>) -> bool {
        let agreement = storage::get_agreement(&env, &agreement_id)
            .unwrap_or_else(|_| panic_with_error!(&env, ContractError::AgreementNotFound));
        env.ledger().timestamp() > agreement.deadlines.expiry
    }

    /// Return the current contract admin address.
    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    /// Update the admin address. Only the current admin may call this.
    ///
    /// Named `update_admin` to avoid shadowing the `storage::set_admin` import
    /// which would cause a recursive call or a name-collision compile error.
    pub fn update_admin(env: Env, new_admin: Address) -> ContractResult<()> {
        let current_admin = storage::get_admin(&env);
        current_admin.require_auth();
        storage::set_admin(&env, &new_admin);
        Ok(())
    }
}
