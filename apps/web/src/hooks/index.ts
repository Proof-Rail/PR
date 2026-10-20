/**
 * Custom hooks barrel.
 *
 * Import from '@/hooks' rather than reaching into individual files:
 *
 *   import { useAgreement, useCopyToClipboard } from '@/hooks';
 *
 * The wallet hook lives in its own provider module and is intentionally not
 * re-exported here to keep its dependency on WalletContext co-located with the
 * provider.  Import it directly:
 *
 *   import { useWallet } from '@/components/wallet/WalletProvider';
 */

export { useAgreement } from './useAgreement';
export type { UseAgreementResult, EvidenceItem } from './useAgreement';

export { useCopyToClipboard } from './useCopyToClipboard';
export type { UseCopyToClipboardResult } from './useCopyToClipboard';
