# PROOFRAIL Deployment Guide

## Prerequisites

### Required Tools
- **Rust**: >= 1.75.0 (`rustup update`)
- **Stellar CLI**: `cargo install --locked stellar-cli`
- **Soroban CLI**: `cargo install --locked soroban-cli`
- **Node.js**: >= 20.0.0
- **pnpm** (recommended): `npm install -g pnpm`

### Testnet Account Setup
1. Create a Stellar account: https://laboratory.stellar.org/#account-creator?network=testnet
2. Fund with Friendbot: https://friendbot.stellar.org
3. Or use CLI: `stellar keys generate --global alice --network testnet --fund`

## Contract Deployment

### 1. Build the Contract
```bash
cd contracts/proofrail_escrow
cargo build --target wasm32-unknown-unknown --release
```

### 2. Optimize WASM (Recommended)
```bash
# Install wasm-opt if not available
cargo install wasm-opt

# Optimize
wasm-opt -Oz target/wasm32-unknown-unknown/release/proofrail_escrow.wasm -o target/wasm32-unknown-unknown/release/proofrail_escrow.opt.wasm
```

### 3. Deploy to Testnet
```bash
# Using stellar CLI (recommended)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proofrail_escrow.opt.wasm \
  --source alice \
  --network testnet \
  --alias proofrail_escrow

# Or using soroban CLI
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proofrail_escrow.opt.wasm \
  --source alice \
  --network testnet
```

### 4. Initialize the Contract
```bash
# Get the deployed contract ID
CONTRACT_ID=$(stellar contract id --alias proofrail_escrow --network testnet)

# Initialize with admin (your account)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source alice \
  --network testnet \
  -- initialize --admin $(stellar keys address alice)
```

### 5. Verify Deployment
```bash
# Check protocol version
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- protocol_version

# Should return: 1
```

## Frontend Deployment

### 1. Configure Environment
```bash
# Copy example
cp .env.example .env.local

# Edit with your contract ID
# NEXT_PUBLIC_ESCROW_CONTRACT_ID=CA7B...K3M2
# NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

### 2. Install Dependencies
```bash
# From repo root
pnpm install
```

### 3. Build Frontend
```bash
pnpm web:build
```

### 4. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or connect GitHub repo to Vercel dashboard
```

### 5. Configure Vercel Environment Variables
In Vercel dashboard, add:
- `NEXT_PUBLIC_STELLAR_NETWORK=testnet`
- `NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org`
- `NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org`
- `NEXT_PUBLIC_ESCROW_CONTRACT_ID=<your-contract-id>`
- `NEXT_PUBLIC_WALLET_NETWORK=TESTNET`

## Local Development

### 1. Start Local Network (Optional)
```bash
# Start Stellar Quickstart (includes Soroban RPC)
docker run --rm -it -p 8000:8000 stellar/quickstart --testnet
```

### 2. Deploy Contracts Locally
```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Deploy to local network
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/proofrail_escrow.wasm \
  --source alice \
  --network local \
  --alias proofrail_escrow_local
```

### 3. Run Frontend
```bash
pnpm web:dev
# Opens http://localhost:3000
```

## Testing

### Contract Tests
```bash
cd contracts/proofrail_escrow
cargo test
```

### Frontend Tests
```bash
pnpm test --workspace=apps/web
```

### Integration Tests
```bash
# Requires testnet deployment and funded accounts
pnpm test:e2e
```

## Mainnet Deployment (Production)

### ⚠️ Important Warnings
- **This is experimental software** - not audited
- **Test thoroughly on testnet first**
- **Use multisig for admin keys**
- **Consider formal verification for high-value deployments**

### Steps
1. Complete all testnet testing
2. Security review / audit
3. Deploy contracts to mainnet with multisig admin
4. Update frontend env vars for mainnet
5. Deploy frontend
6. Monitor closely

## Contract Upgrades

### Current Architecture
The contract is **not upgradeable** by design for security. To upgrade:
1. Deploy new contract version
2. Migrate state (if needed) via admin functions
3. Update frontend to use new contract ID
4. Users create new agreements on new contract

### Future: Upgradeable Pattern
If upgradeability is needed:
```rust
// Add to contract
pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
    admin.require_auth();
    env.deployer().update_current_contract_wasm(new_wasm_hash);
}
```

## Monitoring

### Contract Events
Query events via Soroban RPC:
```bash
stellar contract events \
  --contract-id $CONTRACT_ID \
  --network testnet \
  --start-ledger 123456
```

### Health Checks
- RPC endpoint responsiveness
- Contract invocation success rate
- Frontend build status

## Troubleshooting

### Contract Deployment Fails
- Check WASM size (< 100KB recommended)
- Verify account has sufficient XLM for fees
- Ensure network passphrase matches

### Frontend Can't Connect to RPC
- Verify `NEXT_PUBLIC_STELLAR_RPC_URL` is correct
- Check CORS settings on RPC provider
- Try alternative RPC: `https://soroban-testnet.stellar.org`

### Wallet Connection Issues
- Ensure wallet extension is installed
- Check network matches (TESTNET vs PUBLIC)
- Clear browser cache / wallet cache

### Transaction Failures
- Insufficient balance for fees
- Token trustline not established (for non-native assets)
- Contract state doesn't allow operation
- Deadline passed

## Useful Commands

```bash
# Get contract info
stellar contract info --id $CONTRACT_ID --network testnet

# Invoke read function
stellar contract invoke --id $CONTRACT_ID --network testnet -- get_agreement --agreement_id <ID>

# Check account balance
stellar keys balance alice --network testnet

# View transaction
stellar txn get --hash <TX_HASH> --network testnet
```

## Support

- Documentation: https://docs.proofrail.org (when available)
- Issues: https://github.com/proofrail/proofrail/issues
- Discord: https://discord.gg/proofrail (when available)