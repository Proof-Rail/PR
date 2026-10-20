# PROOFRAIL

<div align="center">

![PROOFRAIL](https://img.shields.io/badge/PROOFRAIL-Evidence--to--Settlement-3b82f6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48cGF0aCBkPSJNMTIgMjJzOC00IDgtMTBWNWwtOC0zLTggM3Y3YzAgNiA4IDEwIDggMTB6Ii8+PC9zdmc+)
![Stellar](https://img.shields.io/badge/Stellar-Soroban-7c3aed?style=for-the-badge&logo=stellar&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-no__std-f97316?style=for-the-badge&logo=rust&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

**Conditional escrow on Stellar. Evidence-first. No database. No admin keys.**

[Live Demo](https://github.com/Proof-Rail/PR) · [Documentation](/docs) · [Contract API](docs/CONTRACT_API.md) · [Architecture](docs/ARCHITECTURE.md)

</div>

---

> **Evidence-to-settlement protocol on Stellar / Soroban.**

PROOFRAIL lets two or more parties create conditional escrow agreements where funds are released, refunded, or split only after verifiable evidence is submitted and approved. Evidence files stay off-chain; their SHA-256 hashes are committed on-chain. A designated verifier attests to those hashes, and a Soroban smart contract moves the money — with **no database**, **no admin key** that can drain the escrow, and **no trusted intermediary**.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Repository Layout](#repository-layout)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [SDK Usage](#sdk-usage)
- [Smart Contract](#smart-contract)
- [Testing](#testing)
- [Security](#security)
- [Documentation](#documentation)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [License](#license)

---

## How It Works

```
  Created ──▶ Funded ──▶ In Progress ──▶ Awaiting Verification ──▶ Settled
                │              │                   │
                │              └───────────────────┤
                │                                  ▼
                │                         Disputed ──▶ Resolved
                │                       (release / refund / split)
                │
                ├──▶ Refunded   (payer request, or expiry with funds)
                └──▶ Expired    (expiry with no funds)
```

| Step | Who | What happens |
|------|-----|--------------|
| **1. Create** | Creator (payer or payee) | Registers parties, token, amount, terms hash, verification policy, dispute policy, and deadlines on-chain. |
| **2. Fund** | Payer | Transfers the full escrow amount to the contract via `TokenClient::transfer`. |
| **3. Submit evidence** | Any party | Uploads evidence off-chain, submits its `content_hash` + optional reference URL. First submission transitions the agreement to *In Progress*. |
| **4. Verify** | Designated verifier | Approves or rejects each evidence item. When the policy is satisfied the agreement becomes *Awaiting Verification*. |
| **5. Settle / Refund / Dispute** | Payee / Payer / Resolver | Funds are released to the payee (settle), returned to the payer (refund or expired), or split by an authorized resolver (dispute resolution). |

Every mutating entry point calls `require_auth()` for the acting party. The admin key can never move escrowed funds — it only manages protocol metadata.

---

## Repository Layout

```
PROOFRAIL/
│
├── apps/
│   └── web/                        Next.js 14 front-end
│       └── src/
│           ├── app/                Routes (Next.js App Router)
│           │   ├── page.tsx                 Home — Hero, Features, Lifecycle
│           │   ├── create/page.tsx          Multi-step agreement creation wizard
│           │   ├── dashboard/page.tsx       Connected user's agreement list
│           │   ├── agreement/[id]/page.tsx  Agreement detail + actions
│           │   └── docs/page.tsx            Documentation index
│           │
│           ├── components/
│           │   ├── agreement/      AgreementCard, AgreementStateBadge
│           │   ├── evidence/       EvidenceCard
│           │   ├── layout/         Header, Hero, Features, Lifecycle, Footer
│           │   ├── ui/             Button, Card, Input/Textarea/Label, Badge, Tabs
│           │   └── wallet/         WalletProvider (useWallet hook)
│           │
│           ├── hooks/
│           │   ├── useAgreement.ts          SDK data-fetching hook
│           │   └── useCopyToClipboard.ts    Clipboard with feedback state
│           │
│           ├── lib/
│           │   ├── config.ts       NEXT_PUBLIC_* env vars → AppConfig
│           │   ├── proofrail.ts    SDK singleton factory (null in demo mode)
│           │   └── utils.ts        cn(), formatAddress(), formatAmount(), …
│           │
│           └── types/
│               └── index.ts        AsyncState, AppError, BadgeVariant, …
│
├── packages/
│   ├── shared/                     @proofrail/shared
│   │   └── src/index.ts            Enums, Zod schemas, interfaces, state machine
│   └── sdk/                        @proofrail/sdk
│       └── src/index.ts            ProofrailSDK class, ScVal helpers, decoders
│
├── contracts/
│   └── proofrail_escrow/           Soroban smart contract (Rust, no_std)
│       └── src/
│           ├── lib.rs              Entry points (#[contractimpl])
│           ├── types.rs            #[contracttype] structs and enums
│           ├── storage.rs          Namespaced get/store + SHA-256 ID generation
│           ├── validation.rs       Guard functions + check_verification_complete
│           ├── events.rs           env.events().publish() helpers
│           └── errors.rs           #[contracterror] ContractError (40+ variants)
│
├── docs/
│   ├── ARCHITECTURE.md             System design and data flow
│   ├── CONTRACT_API.md             Every entry point, error code, and event
│   ├── DEPLOYMENT.md               Testnet/mainnet deployment runbook
│   └── THREAT_MODEL.md             Threats, trust assumptions, mitigations
│
├── .env.example                    Public configuration template
├── Cargo.toml                      Rust workspace
└── package.json                    npm workspaces root
```

---

## Architecture

### Package dependency graph

```
@proofrail/shared           @proofrail/sdk           apps/web
─────────────────           ──────────────────        ────────
Enums                  ──▶  ProofrailSDK class   ──▶  Pages
Zod schemas                 ScVal encoding            Components
TypeScript interfaces        RPC simulation            Hooks
State machine utils          Tx build / submit         lib/proofrail.ts
```

Build order enforced by `npm run build`: `shared` → `sdk` → `web`.

- **`@proofrail/shared`** has zero workspace dependencies. It is the single source of truth for all enums, interfaces, Zod schemas, and the agreement state machine. Both the SDK and the web app import from it.
- **`@proofrail/sdk`** re-exports everything from `shared` and adds the Stellar/Soroban layer: ScVal encoding, RPC reads (simulation), transaction building, signing callbacks, and submission polling.
- **`apps/web`** never reaches into package internals. It imports types and validation from `@proofrail/shared` and chain operations from `@proofrail/sdk`.

### Runtime data flow

```
Browser
  └─ WalletProvider (StellarWalletsKit)
       └─ useWallet() → { address, signTransaction, … }

Page
  ├─ reads config  →  lib/config.ts  →  NEXT_PUBLIC_* env vars
  ├─ gets SDK      →  lib/proofrail.ts  →  ProofrailSDK | null (demo mode)
  ├─ validates     →  @proofrail/shared Zod schemas
  └─ writes        →  sdk.createAgreement(params, async (tx) => {
                         signedXdr = await signTransaction(tx.toXDR(), passphrase)
                         return sdk.submitSigned(parsed)
                       })

ProofrailSDK
  buildTx() → server.prepareTransaction() → signAndSubmit callback
  submitSigned() → server.sendTransaction() → poll getTransaction()

Soroban contract (on-chain)
  lib.rs (entry points)
    └─ validation.rs  →  storage.rs  →  events.rs
```

### Demo mode

When `NEXT_PUBLIC_ESCROW_CONTRACT_ID` is empty (or `NEXT_PUBLIC_DEMO_MODE=true`), `getProofrailSdk()` returns `null`. Every page branches on this:

- Reads return empty / not-found state immediately.
- The creation wizard simulates a 2-second delay and produces a random mock agreement ID.
- No wallet extension or testnet account is required.

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Web app and SDK |
| npm | ≥ 10 | Workspace management |
| Rust + `wasm32-unknown-unknown` | ≥ 1.75 | Contract compilation |
| Stellar CLI | latest | Contract deployment |
| Freighter / Albedo / xBull / Lobstr | browser extension | Wallet signing |

### Install

```bash
git clone https://github.com/proofrail/proofrail.git
cd proofrail
npm install
```

### Build

```bash
npm run build          # shared → sdk → web (in dependency order)
```

### Lint & test

```bash
npm run lint           # next lint + eslint across all packages
npm run test           # vitest across web + packages
```

### Develop

```bash
# Copy and edit the environment file first:
cp .env.example .env.local

npm run dev            # http://localhost:3000  (demo mode, no contract needed)
```

---

## Configuration

Copy `.env.example` to `.env.local`. All values are public — Next.js inlines `NEXT_PUBLIC_*` into the client bundle at build time. **Never put secrets here.**

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban JSON-RPC endpoint |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon REST endpoint |
| `NEXT_PUBLIC_ESCROW_CONTRACT_ID` | *(empty)* | Deployed contract ID. **Empty → demo mode.** |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | *(empty)* | Optional future registry contract |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Force demo mode even with a contract ID |
| `NEXT_PUBLIC_WALLET_NETWORK` | `TESTNET` | Wallet kit network hint (`TESTNET` or `PUBLIC`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Canonical URL for OpenGraph metadata |

---

## Running the App

```bash
# Development server (hot reload)
npm run dev

# Production build + server
npm run build
npm start           # from apps/web
```

Open [http://localhost:3000](http://localhost:3000). Without a deployed contract the app runs in full demo mode.

To connect a wallet and make real testnet transactions:

1. Deploy the contract (see [Smart Contract](#smart-contract) below).
2. Set `NEXT_PUBLIC_ESCROW_CONTRACT_ID` in `.env.local`.
3. Restart the dev server.
4. Fund your testnet account via [Stellar Laboratory](https://laboratory.stellar.org) or `stellar account fund`.

---

## SDK Usage

Install into your own project:

```bash
npm install @proofrail/sdk @proofrail/shared
```

### Read an agreement

```ts
import { createProofrailSDK, TESTNET_CONFIG } from '@proofrail/sdk';

const sdk = createProofrailSDK({
  ...TESTNET_CONFIG,
  escrowContractId: 'C...your-deployed-contract-id',
});

// Read calls use simulation — pass the connected account as the source.
const agreement = await sdk.getAgreement(agreementId, myAddress);
console.log(agreement.state, agreement.fundedAmount);
```

### Create an agreement

```ts
import {
  createProofrailSDK,
  TESTNET_CONFIG,
  validateCreateAgreement,
  EvidenceType,
} from '@proofrail/sdk';
import { TransactionBuilder } from '@stellar/stellar-sdk';

const sdk = createProofrailSDK({ ...TESTNET_CONFIG, escrowContractId: 'C...' });

const now = Math.floor(Date.now() / 1000);
const params = validateCreateAgreement({
  creator:  myAddress,
  payer:    myAddress,
  payee:    'GPAYEE...',
  verifier: 'GVERIFIER...',
  token:    'CUSDC_CONTRACT_ID...',
  amount:   '10000000',          // 1 USDC (7 decimals)
  termsHash: await ProofrailSDK.hashContentBytes(
    new TextEncoder().encode('Deliver feature X by Friday'),
  ),
  verificationPolicy: {
    requiredEvidenceTypes: [EvidenceType.CompletionReport],
    minEvidenceCount: 1,
    requireAllApproved: true,
    autoSettleOnApproval: false,
  },
  disputePolicy: {
    allowedInitiators: [myAddress, 'GPAYEE...'],
    resolver: 'GRESOLVER...',
    resolutionDeadline: now + 30 * 24 * 3600,   // 30 days
    allowAutoResolution: false,
  },
  deadlines: {
    fundingDeadline:      now + 1  * 24 * 3600,  // 1 day
    evidenceDeadline:     now + 7  * 24 * 3600,  // 1 week
    verificationDeadline: now + 10 * 24 * 3600,  // 10 days
    settlementDeadline:   now + 14 * 24 * 3600,  // 2 weeks
    expiry:               now + 30 * 24 * 3600,  // 30 days
  },
});

const result = await sdk.createAgreement(params, async (tx) => {
  const signedXdr = await signWithWallet(tx.toXDR(), TESTNET_CONFIG.networkPassphrase);
  const parsed    = TransactionBuilder.fromXDR(signedXdr, TESTNET_CONFIG.networkPassphrase);
  return sdk.submitSigned(parsed);
});

if (result.success) {
  console.log('Agreement created. Tx hash:', result.hash);
}
```

### Submit evidence

```ts
const contentHash = await ProofrailSDK.hashContentBytes(fileBuffer);

await sdk.submitEvidence(
  { submitter: myAddress, agreementId, evidenceType: EvidenceType.CompletionReport,
    contentHash, reference: 'https://ipfs.io/ipfs/Qm...' },
  signAndSubmitCallback,
);
```

### Inside the web app

Use `getProofrailSdk()` from `@/lib/proofrail` instead of constructing a client directly — it reads `.env.local`, manages the singleton, and returns `null` in demo mode.

```ts
import { getProofrailSdk } from '@/lib/proofrail';
import { useAgreement }    from '@/hooks';

// In a React component:
const { agreement, evidence, loading, error, refetch } = useAgreement(id, address);
```

---

## Smart Contract

The contract is a Rust crate in the Cargo workspace at the repository root.

### Setup

```bash
rustup target add wasm32-unknown-unknown
```

### Build

```bash
npm run contracts:build
# Runs: cargo build --release --target wasm32-unknown-unknown --workspace
# Output: target/wasm32-unknown-unknown/release/proofrail_escrow.wasm
```

### Test

```bash
npm run contracts:test
# Runs: cargo test --workspace
```

### Deploy to testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proofrail_escrow.wasm \
  --source <YOUR_ACCOUNT_ALIAS> \
  --network testnet
```

Copy the returned contract ID into `NEXT_PUBLIC_ESCROW_CONTRACT_ID` in `.env.local`.

Then initialise the contract (one-time):

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <YOUR_ACCOUNT_ALIAS> \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS>
```

Full function signatures, argument types, error codes, and event schemas:
→ **[docs/CONTRACT_API.md](docs/CONTRACT_API.md)**

Full deployment runbook including mainnet steps:
→ **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

### Contract entry points summary

| Function | Auth | Description |
|----------|------|-------------|
| `initialize(admin)` | admin | One-time setup. Prevents re-initialisation. |
| `create_agreement(...)` | creator | Creates agreement, returns agreement ID. |
| `fund(payer, id)` | payer | Locks funds in escrow via token transfer. |
| `submit_evidence(submitter, id, type, hash, ref)` | submitter | Attaches evidence hash on-chain. |
| `verify_evidence(verifier, evidence_id, decision, reason?)` | verifier | Approves / rejects one evidence item. |
| `settle(caller, id)` | payee or verifier | Releases funds to payee. |
| `refund(payer, id)` | payer | Returns funds to payer. |
| `raise_dispute(initiator, id, reason_hash)` | initiator | Opens a dispute, freezes settlement. |
| `resolve_dispute(resolver, dispute_id, resolution)` | resolver | Executes split/release/refund. |
| `check_expiry(id)` | anyone | Refunds or marks expired after the expiry timestamp. |
| `update_admin(new_admin)` | current admin | Transfers protocol admin role. |

---

## Testing

```bash
# JavaScript (all packages)
npm run test

# Watch mode
npm run test:watch --workspace=apps/web

# Rust contract
npm run contracts:test
```

Coverage is currently **thin**: the JavaScript side has no test files yet and the contract's `tests/` directory is empty. All green runs represent build-level verification only. Adding test coverage is a top-priority gap — see [Project Status](#project-status).

---

## Security

- **Auth on every mutation.** All state-changing contract functions call `require_auth()` for the acting party before doing anything.
- **Admin cannot move funds.** The admin key manages only protocol version metadata. It has no path to the escrow balance.
- **Checked arithmetic.** Every balance path uses `checked_add` / `checked_sub`. Resolution amounts are bounded by the escrowed amount.
- **Checks-effects-interactions.** Validation and state updates happen before token transfers.
- **Bounded collections.** A maximum of 50 evidence items per agreement prevents unbounded storage growth.
- **Namespaced storage.** All entities use `StorageKey` enum variants as keys, preventing ID collisions across entity types.
- **Deterministic IDs.** Agreement, evidence, and dispute IDs are SHA-256 hashes of their inputs plus ledger sequence/timestamp, with domain-separator prefix bytes.
- **Deadline enforcement.** All deadlines use `env.ledger().timestamp()` — never caller-supplied values.

Full threat analysis: → **[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)**

---

## Documentation

| Document | Contents |
|----------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, state machine diagram |
| [docs/CONTRACT_API.md](docs/CONTRACT_API.md) | Every entry point, error code, event schema |
| [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) | Threats, trust assumptions, mitigations |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Testnet and mainnet deployment runbook |

Interactive docs are also available in the running app at `/docs`.

---

## Project Status

### Works today

- `npm install && npm run build` succeeds (shared → sdk → web, in order).
- `npm run lint` and `npm run test` pass across all packages.
- The web app runs locally with a complete demo-mode UI flow.
- The SDK performs correct ScVal encoding, RPC simulation, transaction building, signing callbacks, and submission polling.
- All 17 previously identified contract bugs have been fixed (see git history).

### Known gaps

| Gap | Impact | Notes |
|-----|--------|-------|
| Rust contract unverified | High | Run `npm run contracts:build` to verify compilation. No toolchain in the current environment. |
| No JS test files | Medium | All packages run `vitest --passWithNoTests`. Writing tests is the top priority. |
| No Rust contract tests | Medium | `contracts/proofrail_escrow/tests/` is empty. |
| Dashboard always empty | Low | The contract has no per-account agreement index. The dashboard shows empty state until an off-chain indexer is added. |
| Dispute not linked in UI | Low | Disputes are keyed by dispute ID; no agreement→dispute reverse lookup exists yet. |
| Docs sub-pages missing | Low | `/docs/quick-start`, `/docs/architecture`, etc. link from the docs index but have no routes yet. |

---

## Contributing

Contributions are welcome. Before opening a pull request:

1. Fork the repository and create a feature branch.
2. Run `npm run build && npm run lint && npm run test` — all must pass.
3. If your change touches the contract, run `npm run contracts:build && npm run contracts:test`.
4. Keep PRs focused. One concern per PR.
5. Document any new public API (SDK methods, contract entry points, env vars).

For significant changes, open an issue first to discuss the approach.

---

## License

MIT — see [LICENSE](LICENSE).
