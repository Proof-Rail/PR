/**
 * Public runtime configuration.
 *
 * Every value here comes from a NEXT_PUBLIC_* environment variable, which Next.js
 * inlines at build time. No secrets ever belong in this module.
 */

export interface AppConfig {
  /** Stellar network the app targets: 'testnet' | 'mainnet' */
  network: string;
  rpcUrl: string;
  horizonUrl: string;
  escrowContractId: string;
  registryContractId: string;
  walletNetwork: 'TESTNET' | 'PUBLIC';
  /** True when there is no deployed contract to talk to, or demo mode is forced on. */
  demoMode: boolean;
}

function env(key: string, fallback = ''): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

const network = env('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet');
const escrowContractId = env('NEXT_PUBLIC_ESCROW_CONTRACT_ID');
const demoOverride = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const config: AppConfig = {
  network,
  rpcUrl: env('NEXT_PUBLIC_STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org'),
  horizonUrl: env('NEXT_PUBLIC_STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
  escrowContractId,
  registryContractId: env('NEXT_PUBLIC_REGISTRY_CONTRACT_ID'),
  walletNetwork: network === 'mainnet' ? 'PUBLIC' : 'TESTNET',
  demoMode: demoOverride || !escrowContractId,
};
