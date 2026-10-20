import { createProofrailSDK, ProofrailSDK, TESTNET_CONFIG, MAINNET_CONFIG } from '@proofrail/sdk';
import { config } from './config';

let client: ProofrailSDK | null = null;

/** Stellar network passphrase matching the configured network. */
export function getNetworkPassphrase(): string {
  return config.network === 'mainnet' ? MAINNET_CONFIG.networkPassphrase : TESTNET_CONFIG.networkPassphrase;
}

/**
 * Returns a shared SDK client wired to the configured network and deployed
 * contract, or `null` when the app is running in demo mode (no contract ID).
 *
 * Pages should branch on this: demo mode simulates success locally, live mode
 * performs real on-chain reads and writes.
 */
export function getProofrailSdk(): ProofrailSDK | null {
  if (config.demoMode) return null;
  if (!client) {
    const base = config.network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG;
    client = createProofrailSDK({
      rpcUrl: config.rpcUrl,
      networkPassphrase: base.networkPassphrase,
      escrowContractId: config.escrowContractId,
      registryContractId: config.registryContractId || undefined,
    });
  }
  return client;
}

export function isDemoMode(): boolean {
  return config.demoMode;
}
