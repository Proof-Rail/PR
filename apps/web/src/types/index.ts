/**
 * Front-end–only type definitions.
 *
 * Domain types (Agreement, Evidence, Dispute, …) live in @proofrail/shared and
 * are imported from there.  This module holds UI-layer concerns: error shapes,
 * route param contracts, and presentation helpers that don't belong in the
 * shared package.
 */

import type { AgreementState } from '@proofrail/shared';

// ── Generic async state wrapper ───────────────────────────────────────────────

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ── Application error ─────────────────────────────────────────────────────────

export interface AppError {
  message: string;
  /** Optional machine-readable code, e.g. "AgreementNotFound". */
  code?: string;
  /** Original caught value for debugging; never shown to users. */
  cause?: unknown;
}

export function toAppError(e: unknown): AppError {
  if (e instanceof Error) return { message: e.message, cause: e };
  if (typeof e === 'string') return { message: e };
  return { message: 'An unexpected error occurred', cause: e };
}

// ── Route parameter contracts ─────────────────────────────────────────────────

/** Shape of `useParams()` on `/agreement/[id]`. */
export interface AgreementRouteParams {
  id: string;
}

/** Shape of search params used by the agreement detail page action buttons. */
export type AgreementAction =
  | 'fund'
  | 'refund'
  | 'evidence'
  | 'verify'
  | 'settle'
  | 'dispute'
  | 'resolve'
  | 'expiry';

// ── Wallet presentation ───────────────────────────────────────────────────────

export type WalletNetworkLabel = 'Testnet' | 'Mainnet';

export function walletNetworkLabel(network: string | null): WalletNetworkLabel {
  return network === 'MAINNET' ? 'Mainnet' : 'Testnet';
}

// ── Badge variant map ─────────────────────────────────────────────────────────

/** Maps every AgreementState to a Badge variant string. */
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export const AGREEMENT_STATE_VARIANT: Record<AgreementState, BadgeVariant> = {
  0: 'outline',      // Created
  1: 'info',         // Funded
  2: 'warning',      // InProgress
  3: 'default',      // AwaitingVerification
  4: 'destructive',  // Disputed
  5: 'success',      // Settled
  6: 'secondary',    // Refunded
  7: 'destructive',  // Expired
};

// ── Tab key literals ──────────────────────────────────────────────────────────

export type DashboardTab =
  | 'all'
  | 'created'
  | 'payee'
  | 'verifier'
  | 'action_required';

export type AgreementDetailTab =
  | 'evidence'
  | 'verifications'
  | 'disputes'
  | 'activity';
