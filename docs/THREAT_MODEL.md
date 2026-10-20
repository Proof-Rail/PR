# PROOFRAIL Threat Model

## Overview

This document outlines the threat model for the PROOFRAIL evidence-to-settlement protocol. It identifies trusted roles, attack surfaces, mitigations, and residual risks.

## System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Trust Boundary                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Soroban Smart Contract (On-Chain)         │    │
│  │  • Agreement state machine                          │    │
│  │  • Escrow token management                          │    │
│  │  • Evidence commitments                             │    │
│  │  • Verification decisions                           │    │
│  │  • Dispute resolution                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Off-Chain Components (User-Controlled)    │    │
│  │  • Evidence files (documents, images, etc.)         │    │
│  │  • Full agreement terms                             │    │
│  │  • Frontend application (read-only queries)         │    │
│  │  • Wallet signing (transaction authorization)       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Trusted Roles

### 1. Agreement Creator
- **Trust Assumption**: Creates agreement with honest intent
- **Capabilities**: Defines parties, terms, policies, deadlines
- **Risk**: Malicious terms, impossible deadlines, self-dealing
- **Mitigation**: On-chain validation, explicit party consent for funding

### 2. Payer
- **Trust Assumption**: Will fund agreement if terms are acceptable
- **Capabilities**: Funds escrow, can request refund (per policy), can raise disputes (if allowed)
- **Risk**: Refuses to fund, attempts double funding, premature refund requests
- **Mitigation**: State machine enforcement, deadline checks, authorization

### 3. Payee
- **Trust Assumption**: Performs work/delivers goods honestly
- **Capabilities**: Submits evidence, can raise disputes (if allowed), receives settlement
- **Risk**: Submits fake evidence, refuses to accept valid verification
- **Mitigation**: Verifier authorization, evidence hash commitments

### 4. Verifier (Authorized)
- **Trust Assumption**: Evaluates evidence honestly and competently
- **Capabilities**: Approves/rejects evidence, triggers auto-settle (if enabled)
- **Risk**: Collusion, incompetence, bias, key compromise
- **Mitigation**: Explicit designation, `require_all_approved` policy, dispute fallback

### 5. Dispute Resolver (Authorized)
- **Trust Assumption**: Resolves disputes fairly per agreement terms
- **Capabilities**: Determines fund distribution (up to escrow balance)
- **Risk**: Collusion, bias, key compromise, arbitrary decisions
- **Mitigation**: Explicit designation, resolution deadline, capped distributions

### 6. Stellar Network
- **Trust Assumption**: Consensus, finality, and censorship resistance hold
- **Risk**: Network halt, consensus failure, censorship
- **Mitigation**: Protocol inherits Stellar guarantees

## Attack Surfaces & Mitigations

### Smart Contract Layer

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| Unauthorized State Changes | Attacker calls mutating functions without auth | `require_auth` on all mutating functions | Low - Soroban auth is cryptographically enforced |
| Reentrancy | Malicious token contract re-enters during transfer | Checks-effects-interactions pattern; transfers last | Low - No external calls after state changes |
| Integer Overflow | Arithmetic operations exceed bounds | Checked arithmetic (`checked_add`, `checked_sub`) | Low - Rust/Soroban SDK enforces |
| Storage Exhaustion | Unbounded arrays fill contract storage | Bounded collections (max 50 evidence per agreement) | Low - Hard limits enforced |
| Deadline Manipulation | Attacker influences ledger timestamps | Use `env.ledger().timestamp()` (not caller-controlled) | Low - Ledger time is consensus-driven |
| Token Mismatch | Wrong token or amount used for funding | Validate token address and amount on funding | Low - On-chain validation |
| Double Funding | Payer funds same agreement twice | State check (`funded_amount == 0`) + state transition | Low |
| Double Settlement | Multiple settlement attempts | State check (`state == AwaitingVerification`) + transition to `Settled` | Low |
| Unauthorized Verification | Non-verifier submits verification | Check `verifier` field matches caller | Low |
| Dispute Bypass | Settle despite open dispute | State check prevents settlement in `Disputed` state | Low |
| Resolution Exceeds Escrow | Resolver allocates more than held | Validate total resolution ≤ `funded_amount` | Low |

### Off-Chain Layer

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| Evidence Tampering | File changed after hash submission | Hash committed on-chain; verify by re-hashing | Medium - Requires user to verify |
| Fake Evidence | Submitter creates fraudulent evidence | Verifier evaluates; dispute mechanism | Medium - Depends on verifier honesty |
| Phishing | Fake frontend steals wallet signatures | User verifies domain; wallet shows transaction details | Medium - User education required |
| RPC Manipulation | Malicious RPC returns false state | User can verify via multiple RPCs/explorers | Low - On-chain truth is immutable |
| Frontend Compromise | Malicious JS injected | Content Security Policy; Subresource Integrity | Medium - Standard web security |

### Cryptographic

| Threat | Description | Mitigation | Residual Risk |
|--------|-------------|------------|---------------|
| Hash Collision | Two files produce same SHA-256 | SHA-256 collision resistance | Negligible |
| Key Compromise | Wallet private key stolen | Hardware wallets; multisig for high value | Medium - User responsibility |

## Data Flow Security

### Agreement Creation
```
Creator → [validate parties, deadlines, policies] → Contract Storage
```
- All inputs validated on-chain
- Creator must be one of the parties (or verifier)

### Funding
```
Payer → Token.transfer(contract) → Contract updates state → Event emitted
```
- `require_auth(payer)`
- Token address validated
- Amount validated against agreement

### Evidence Submission
```
Submitter → Contract stores hash + reference → State transition (if first evidence)
```
- Only authorized parties (payer, payee, verifier) can submit
- Hash stored; reference optional URL
- Evidence count bounded

### Verification
```
Verifier → Contract stores decision → Check completion → State transition
```
- Only designated verifier can verify
- Decision recorded with timestamp
- Completion check enforces policy

### Settlement
```
Caller (payee/verifier) → Token.transfer(payee) → State = Settled
```
- Requires `AwaitingVerification` state
- Requires verification complete per policy
- Requires not in dispute
- Funds transferred to payee only

### Dispute Resolution
```
Resolver → Contract validates resolution ≤ escrow → Token.transfer per resolution → State = Settled
```
- Only designated resolver can resolve
- Resolution amounts validated against escrow
- Distribution executed atomically

## Residual Risks

### High
1. **Verifier/Resolver Collusion**: If verifier and resolver are same entity or collude, they can unfairly resolve disputes
   - *Mitigation*: Use different entities; consider multi-sig resolver (future)

2. **Evidence Authenticity**: On-chain hash only proves file matches commitment, not that underlying claim is true
   - *Mitigation*: Clear documentation; verifier responsibility

### Medium
3. **Resolver Key Compromise**: If resolver key stolen, attacker can resolve disputes arbitrarily
   - *Mitigation*: Use hardware wallets; time-locked resolutions (future)

4. **Frontend Supply Chain**: Compromised npm package or build process
   - *Mitigation*: Lockfiles; reproducible builds; verification

### Low
5. **Stellar Network Failure**: Consensus halt or censorship
   - *Mitigation*: Protocol inherits network guarantees

6. **Soroban VM Bugs**: Runtime bugs in Wasm execution
   - *Mitigation*: Extensive testing; formal verification (future)

## Security Checklist for Deployments

- [ ] Contract deployed with correct admin
- [ ] Admin key stored securely (hardware wallet / multisig)
- [ ] Testnet deployment tested end-to-end
- [ ] Frontend CSP headers configured
- [ ] Dependency audit passed (`cargo audit`, `npm audit`)
- [ ] Integration tests pass on testnet
- [ ] Emergency pause mechanism documented (if applicable)
- [ ] Incident response plan documented

## Future Improvements

1. **Multi-sig Resolver**: Require multiple signers for dispute resolution
2. **Arbitration Marketplace**: Decentralized pool of resolvers with reputation
3. **Time-locked Resolutions**: Delayed execution for dispute resolutions
4. **Formal Verification**: Mathematical proofs for critical properties
5. **Bug Bounty Program**: Incentivize responsible disclosure
6. **Upgrade Governance**: Timelock + multisig for contract upgrades

## Contact

Security issues should be reported to security@proofrail.org (when available) or via GitHub Security Advisories.