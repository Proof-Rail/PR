# PROOFRAIL Architecture Document

## Overview

PROOFRAIL is an evidence-to-settlement protocol built on Stellar/Soroban that enables conditional fund release based on verifiable conditions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Application (Next.js)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Wallet    │  │   SDK       │  │   UI        │              │
│  │   Connect   │◄─┤   Client    │◄─┤   Components│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ RPC / Horizon
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Soroban Smart Contracts                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              proofrail_escrow (Main Contract)            │    │
│  │  • Agreement lifecycle (state machine)                   │    │
│  │  • Escrow funding & settlement                           │    │
│  │  • Evidence commitments                                  │    │
│  │  • Verification & attestations                           │    │
│  │  • Dispute handling                                      │    │
│  │  • Refunds & expiry                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### On-Chain (Authoritative)
- Agreement state & metadata
- Escrow balances & token info
- Evidence hashes & references
- Verification decisions
- Dispute records
- Settlement/refund status
- Protocol events

### Off-Chain (User-Controlled)
- Evidence files (documents, images, etc.)
- Full agreement terms documents
- File storage (IPFS, cloud, local)

### Browser Storage (Non-Authoritative)
- Theme preference
- Dismissed onboarding tips
- Wallet connection cache

## Contract Design

### Agreement States
```
CREATED → FUNDED → IN_PROGRESS → AWAITING_VERIFICATION → SETTLED
                │                    │
                │                    └──→ DISPUTED → RESOLVED
                │
                └──→ EXPIRED → REFUNDED
```

### Core Data Structures

**Agreement**
- `id`: BytesN<32> (unique identifier)
- `payer`: Address
- `payee`: Address
- `verifier`: Option<Address>
- `token`: Address (Soroban token contract)
- `amount`: i128
- `terms_hash`: BytesN<32>
- `verification_policy`: VerificationPolicy
- `dispute_policy`: DisputePolicy
- `deadlines`: Deadlines
- `state`: AgreementState
- `funded_amount`: i128
- `created_at`: u64 (ledger timestamp)
- `protocol_version`: u32

**Evidence**
- `id`: BytesN<32>
- `agreement_id`: BytesN<32>
- `submitter`: Address
- `evidence_type`: EvidenceType
- `content_hash`: BytesN<32>
- `reference`: String (bounded)
- `submitted_at`: u64

**Verification**
- `verifier`: Address
- `evidence_id`: BytesN<32>
- `decision`: VerificationDecision
- `reason_hash`: Option<BytesN<32>>
- `decided_at`: u64

**Dispute**
- `id`: BytesN<32>
- `agreement_id`: BytesN<32>
- `initiator`: Address
- `reason_hash`: BytesN<32>
- `state`: DisputeState
- `resolver`: Option<Address>
- `resolution`: Option<DisputeResolution>
- `created_at`: u64
- `resolved_at`: Option<u64>

## Security Model

### Trust Assumptions
1. **Verifier**: Authorized party trusted to evaluate evidence honestly
2. **Dispute Resolver**: Authorized party trusted to resolve disputes fairly
3. **Token Contract**: Standard Soroban token interface behaves correctly
4. **Stellar Network**: Consensus and finality guarantees hold

### Attack Surface & Mitigations

| Threat | Mitigation |
|--------|------------|
| Unauthorized state changes | `require_auth` on all mutating functions |
| Double funding | State check + funded_amount tracking |
| Double settlement | State check + settled flag |
| Reentrancy | Checks-effects-interactions pattern |
| Integer overflow | Checked arithmetic (`checked_add`, `checked_sub`) |
| Unbounded storage | Bounded collections, max evidence per agreement |
| Deadline manipulation | Ledger-based timestamps, no caller-controlled times |
| Token mismatch | Validate token & amount on funding |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Smart Contracts | Rust, Soroban SDK |
| Blockchain | Stellar Testnet (development), Mainnet (production) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | @stellar/freighter-api (browser extension) |
| RPC | Soroban RPC |
| Token | Stellar Asset / Soroban Token Interface |
| Cryptography | Web Crypto API (SHA-256) |
| Testing | cargo test, vitest, playwright |

## Deployment

- **Contracts**: Deployed separately via Stellar CLI / Soroban CLI
- **Frontend**: Vercel-compatible static export or SSR
- **Environment**: `.env` with public config only (RPC URL, contract IDs)
- **No Database**: All authoritative state on-chain

## Known Limitations (MVP)

1. No indexer - historical queries limited by RPC retention
2. Single-token escrow per agreement
3. No partial/milestone payments (can be added later)
4. Dispute resolver is a trusted role (future: multi-sig, arbitration)
5. Evidence references are URLs - no guaranteed persistence
6. No formal verification or audit (explicitly documented)

## Future Extensions

1. Registry contract for reusable policies
2. Multi-token support
3. Milestone-based partial settlements
4. Arbitration marketplace integration
5. Indexer for historical analytics
6. Mobile SDK