# PROOFRAIL Contract API

Reference for `proofrail_escrow`, the main protocol contract. All functions
below are exposed through `#[contractimpl]` in
`contracts/proofrail_escrow/src/lib.rs`.

- **Soroban SDK**: 22.x
- **Authorization model**: every mutating entry point calls `require_auth()` on
  the acting party; there is no admin key that can move escrowed funds.
- **Units**: `amount`/`funded_amount` are `i128` in the smallest token unit
  (e.g. stroops for XLM, 7 decimals). Timestamps are Unix seconds (`u64`) taken
  from the ledger, never from the caller.

## Agreement lifecycle

```
Created ──fund──▶ Funded ──submit_evidence──▶ InProgress
                        │                            │
                        │                    verify_evidence (complete)
                        │                            ▼
                        │                  AwaitingVerification ──settle──▶ Settled
                        │                            │
                        ├──refund────────────────────┤
                        └──raise_dispute──▶ Disputed ──resolve_dispute──▶ Settled/Refunded

Any funded, non-terminal state ──check_expiry──▶ Refunded (funds returned) or Expired
```

Terminal states: `Settled`, `Refunded`, `Expired`.

## Administration

| Function | Signature | Notes |
|----------|-----------|-------|
| `initialize` | `(admin: Address)` | One-time setup. `admin.require_auth()`. |
| `protocol_version` | `() -> u32` | Returns the stored protocol version. |
| `get_admin` | `() -> Address` | Current admin address. |
| `set_admin` | `(new_admin: Address)` | Requires the current admin's auth. Cannot move funds. |

## Mutations

### `create_agreement`

```rust
create_agreement(
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
) -> BytesN<32>
```

Requires `creator.require_auth()`. Validates parties differ, `amount > 0`,
deadlines are strictly increasing and in the future, and policies are
non-empty. The returned `agreement_id` is `SHA-256(creator || payer || payee
|| token || amount || ledger.sequence || ledger.timestamp)`.

### `fund`

```rust
fund(payer: Address, agreement_id: BytesN<32>)
```

Requires `payer.require_auth()` and state `Created`. Pulls `amount` from the
payer into the contract via the token `transfer`, then sets
`funded_amount = amount` and state `Funded`.

### `submit_evidence`

```rust
submit_evidence(
    submitter: Address,
    agreement_id: BytesN<32>,
    evidence_type: EvidenceType,
    content_hash: BytesN<32>,
    reference: String,          // ≤ 512 chars
) -> BytesN<32>
```

The first party (payer, payee, or verifier) may submit. Moves `Funded →
InProgress`. Limited to 50 evidence items per agreement. The `content_hash` is
the off-chain commitment (SHA-256 of the file); the file itself never touches
the chain.

### `verify_evidence`

```rust
verify_evidence(
    verifier: Address,
    evidence_id: BytesN<32>,
    decision: VerificationDecision,   // Approved | Rejected | NeedsRevision
    reason_hash: Option<BytesN<32>>,
)
```

Only the agreement's configured `verifier` (or the admin fallback) may verify,
and only once per evidence item. When the verification policy is satisfied the
agreement moves to `AwaitingVerification`.

### `settle`

```rust
settle(caller: Address, agreement_id: BytesN<32>)
```

Payee, verifier, or creator may call once verification is complete and the
agreement is not expired or disputed. Transfers `funded_amount` to the payee
and marks the agreement `Settled`.

### `refund`

```rust
refund(payer: Address, agreement_id: BytesN<32>)
```

Payer only, allowed in `Created`, `Funded`, or `InProgress` while funded and
not under dispute. Returns `funded_amount` to the payer.

### `raise_dispute`

```rust
raise_dispute(
    initiator: Address,
    agreement_id: BytesN<32>,
    reason_hash: BytesN<32>,
) -> BytesN<32>
```

Initiator must be an address listed in `dispute_policy.allowed_initiators`.
Moves the agreement to `Disputed` and records an open dispute.

### `resolve_dispute`

```rust
resolve_dispute(
    resolver: Address,
    dispute_id: BytesN<32>,
    resolution: DisputeResolution,
)
```

`resolver` must match `dispute_policy.resolver`. Resolution variants:

- `ReleaseToPayee { amount }`
- `RefundToPayer { amount }`
- `Split { payee_amount, payer_amount }` — must sum to ≤ escrow balance

Executes the token transfers immediately, then settles the agreement.

### `check_expiry`

```rust
check_expiry(agreement_id: BytesN<32>)
```

Permissionless. After `deadlines.expiry`, refunds a funded non-terminal
agreement to the payer; otherwise marks it `Expired`.

## Read-only queries

| Function | Returns |
|----------|---------|
| `get_agreement(agreement_id)` | `Agreement` |
| `get_evidence(evidence_id)` | `Evidence` |
| `get_verification(evidence_id)` | `Option<Verification>` |
| `get_dispute(dispute_id)` | `Dispute` |
| `get_agreement_evidence(agreement_id)` | `Vec<BytesN<32>>` |
| `get_agreement_verifications(agreement_id)` | `Vec<Verification>` |
| `get_agreement_state(agreement_id)` | `AgreementState` |
| `is_expired(agreement_id)` | `bool` (past `deadlines.expiry`) |

## Error codes

Defined in `contracts/proofrail_escrow/src/errors.rs` as `#[contracterror]`
variants. Ranges:

| Range | Category |
|-------|----------|
| 1–6 | General (not initialized, unauthorized, invalid input, not found) |
| 100–115 | Agreement state/policy |
| 200–202 | Funding & token |
| 300–306 | Evidence |
| 400–404 | Verification |
| 500–507 | Disputes |
| 600–605 | Settlement/refund |
| 700–702 | Arithmetic |

## Events

Contract events are declared in `src/events.rs` with `#[contractevent]`:
`AgreementEvent`, `EvidenceEvent`, and `DisputeEvent`. Consumers should index
these (e.g. via Soroban RPC `getEvents`) rather than polling storage, noting
RPC retention limits.
