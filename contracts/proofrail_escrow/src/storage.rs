use soroban_sdk::{Env, Address, BytesN, Bytes, Vec, symbol_short};
use crate::types::*;
use crate::errors::{ContractError, ContractResult};

// ── Storage key helpers ───────────────────────────────────────────────────────
//
// Every entity type is namespaced through the `StorageKey` enum defined in
// types.rs so that different entity IDs can never collide in storage even if
// their raw 32-byte values happen to be identical.

fn admin_key() -> StorageKey {
    StorageKey::Admin
}

fn protocol_version_key() -> StorageKey {
    StorageKey::ProtocolVersion
}

fn agreement_key(id: &BytesN<32>) -> StorageKey {
    StorageKey::Agreement(id.clone())
}

fn evidence_key(id: &BytesN<32>) -> StorageKey {
    StorageKey::Evidence(id.clone())
}

fn verification_key(id: &BytesN<32>) -> StorageKey {
    StorageKey::Verification(id.clone())
}

fn dispute_key(id: &BytesN<32>) -> StorageKey {
    StorageKey::Dispute(id.clone())
}

fn agreement_evidence_list_key(agreement_id: &BytesN<32>) -> StorageKey {
    StorageKey::AgreementEvidenceList(agreement_id.clone())
}

fn agreement_verifications_key(agreement_id: &BytesN<32>) -> StorageKey {
    StorageKey::AgreementVerifications(agreement_id.clone())
}

// ── Admin / protocol version ──────────────────────────────────────────────────

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&admin_key())
        .expect("contract not initialized")
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&admin_key(), admin);
}

pub fn get_protocol_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&protocol_version_key())
        .unwrap_or(1u32)
}

pub fn set_protocol_version(env: &Env, version: u32) {
    env.storage().instance().set(&protocol_version_key(), &version);
}

// ── Agreement ─────────────────────────────────────────────────────────────────

pub fn store_agreement(env: &Env, agreement: &Agreement) {
    env.storage()
        .persistent()
        .set(&agreement_key(&agreement.id), agreement);
}

pub fn get_agreement(env: &Env, agreement_id: &BytesN<32>) -> ContractResult<Agreement> {
    env.storage()
        .persistent()
        .get(&agreement_key(agreement_id))
        .ok_or(ContractError::AgreementNotFound)
}

// ── Evidence ──────────────────────────────────────────────────────────────────

pub fn store_evidence(env: &Env, evidence: &Evidence) {
    env.storage()
        .persistent()
        .set(&evidence_key(&evidence.id), evidence);
}

pub fn get_evidence(env: &Env, evidence_id: &BytesN<32>) -> ContractResult<Evidence> {
    env.storage()
        .persistent()
        .get(&evidence_key(evidence_id))
        .ok_or(ContractError::EvidenceNotFound)
}

// ── Verification ──────────────────────────────────────────────────────────────

pub fn store_verification(env: &Env, verification: &Verification) {
    env.storage()
        .persistent()
        .set(&verification_key(&verification.evidence_id), verification);
}

pub fn get_verification(env: &Env, evidence_id: &BytesN<32>) -> Option<Verification> {
    env.storage()
        .persistent()
        .get(&verification_key(evidence_id))
}

// ── Dispute ───────────────────────────────────────────────────────────────────

pub fn store_dispute(env: &Env, dispute: &Dispute) {
    env.storage()
        .persistent()
        .set(&dispute_key(&dispute.id), dispute);
}

pub fn get_dispute(env: &Env, dispute_id: &BytesN<32>) -> ContractResult<Dispute> {
    env.storage()
        .persistent()
        .get(&dispute_key(dispute_id))
        .ok_or(ContractError::DisputeNotFound)
}

// ── Per-agreement evidence list ───────────────────────────────────────────────

pub fn update_agreement_evidence_list(
    env: &Env,
    agreement_id: &BytesN<32>,
    evidence_id: &BytesN<32>,
) {
    let key = agreement_evidence_list_key(agreement_id);
    let mut list: Vec<BytesN<32>> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    if list.len() < 50 {
        list.push_back(evidence_id.clone());
        env.storage().persistent().set(&key, &list);
    }
}

pub fn get_agreement_evidence_list(env: &Env, agreement_id: &BytesN<32>) -> Vec<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&agreement_evidence_list_key(agreement_id))
        .unwrap_or_else(|| Vec::new(env))
}

// ── Per-agreement verification list ──────────────────────────────────────────

pub fn update_agreement_verifications(
    env: &Env,
    agreement_id: &BytesN<32>,
    verification: &Verification,
) {
    let key = agreement_verifications_key(agreement_id);
    let mut list: Vec<Verification> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));

    if list.len() < 50 {
        list.push_back(verification.clone());
        env.storage().persistent().set(&key, &list);
    }
}

pub fn get_agreement_verifications(env: &Env, agreement_id: &BytesN<32>) -> Vec<Verification> {
    env.storage()
        .persistent()
        .get(&agreement_verifications_key(agreement_id))
        .unwrap_or_else(|| Vec::new(env))
}

// ── ID generation ─────────────────────────────────────────────────────────────
//
// Each ID is the SHA-256 of a hand-built byte buffer that concatenates all
// inputs in a deterministic order.  We cannot use a `Vec<T>` with mixed types,
// so we serialise each value into a `Bytes` buffer and hash that instead.
//
// Layout helpers: big-endian fixed-width encodings.

fn append_u32(buf: &mut Bytes, v: u32) {
    buf.push_back(((v >> 24) & 0xff) as u8);
    buf.push_back(((v >> 16) & 0xff) as u8);
    buf.push_back(((v >>  8) & 0xff) as u8);
    buf.push_back(( v        & 0xff) as u8);
}

fn append_u64(buf: &mut Bytes, v: u64) {
    buf.push_back(((v >> 56) & 0xff) as u8);
    buf.push_back(((v >> 48) & 0xff) as u8);
    buf.push_back(((v >> 40) & 0xff) as u8);
    buf.push_back(((v >> 32) & 0xff) as u8);
    buf.push_back(((v >> 24) & 0xff) as u8);
    buf.push_back(((v >> 16) & 0xff) as u8);
    buf.push_back(((v >>  8) & 0xff) as u8);
    buf.push_back(( v        & 0xff) as u8);
}

fn append_i128(buf: &mut Bytes, v: i128) {
    // Treat as 16 big-endian bytes (two's complement).
    let bits = v as u128;
    for shift in (0..16u32).rev() {
        buf.push_back(((bits >> (shift * 8)) & 0xff) as u8);
    }
}

fn append_address(buf: &mut Bytes, addr: &Address) {
    // Serialise the address to its canonical XDR bytes and append them.
    let addr_bytes = addr.to_xdr(buf.env());
    for i in 0..addr_bytes.len() {
        buf.push_back(addr_bytes.get(i).unwrap());
    }
}

fn append_bytes32(buf: &mut Bytes, b: &BytesN<32>) {
    for i in 0..32u32 {
        buf.push_back(b.get(i).unwrap());
    }
}

pub fn generate_agreement_id(
    env: &Env,
    creator: &Address,
    payer: &Address,
    payee: &Address,
    token: &Address,
    amount: i128,
) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    // Domain separator so agreement IDs can never collide with other entity IDs.
    buf.push_back(0x01);
    append_address(&mut buf, creator);
    append_address(&mut buf, payer);
    append_address(&mut buf, payee);
    append_address(&mut buf, token);
    append_i128(&mut buf, amount);
    append_u32(&mut buf, env.ledger().sequence());
    append_u64(&mut buf, env.ledger().timestamp());
    env.crypto().sha256(&buf)
}

pub fn generate_evidence_id(
    env: &Env,
    agreement_id: &BytesN<32>,
    submitter: &Address,
    content_hash: &BytesN<32>,
) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(0x02);
    append_bytes32(&mut buf, agreement_id);
    append_address(&mut buf, submitter);
    append_bytes32(&mut buf, content_hash);
    append_u32(&mut buf, env.ledger().sequence());
    env.crypto().sha256(&buf)
}

pub fn generate_dispute_id(
    env: &Env,
    agreement_id: &BytesN<32>,
    initiator: &Address,
    reason_hash: &BytesN<32>,
) -> BytesN<32> {
    let mut buf = Bytes::new(env);
    buf.push_back(0x03);
    append_bytes32(&mut buf, agreement_id);
    append_address(&mut buf, initiator);
    append_bytes32(&mut buf, reason_hash);
    append_u32(&mut buf, env.ledger().sequence());
    env.crypto().sha256(&buf)
}
