'use client';

/**
 * useAgreement
 *
 * Fetches a single agreement and its associated evidence (+ verifications) from
 * the chain via the ProofrailSDK.  Falls back to an empty/null state in demo
 * mode (no contract configured) without throwing.
 *
 * Usage:
 *   const { agreement, evidence, loading, error, refetch } = useAgreement(id);
 */

import { useState, useEffect, useCallback } from 'react';
import type { Agreement, Evidence, Verification, Dispute } from '@proofrail/shared';
import { getProofrailSdk } from '@/lib/proofrail';
import { toAppError } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Evidence enriched with its optional verification record. */
export interface EvidenceItem extends Evidence {
  verification?: Verification;
}

export interface UseAgreementResult {
  agreement: Agreement | null;
  evidence: EvidenceItem[];
  dispute: Dispute | null;
  loading: boolean;
  /** Human-readable error string, or null when there is no error. */
  error: string | null;
  /** Re-run the fetch — useful after a write action completes. */
  refetch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @param agreementId  Hex-encoded 32-byte agreement ID from the URL.
 * @param sourceAddress  Connected wallet address used as the RPC simulation
 *                       source.  Pass `null` to skip the fetch entirely.
 */
export function useAgreement(
  agreementId: string | null,
  sourceAddress: string | null,
): UseAgreementResult {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    // Nothing to fetch without both inputs.
    if (!agreementId || !sourceAddress) return;

    const sdk = getProofrailSdk();

    // Demo mode: no contract deployed — leave everything null/empty.
    if (!sdk) {
      setAgreement(null);
      setEvidence([]);
      setDispute(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch the agreement itself.
      const agreementData = await sdk.getAgreement(agreementId, sourceAddress);
      setAgreement(agreementData);

      // 2. Fetch all evidence IDs, then hydrate each with its verification.
      const evidenceIds = await sdk.getAgreementEvidence(agreementId, sourceAddress);

      const evidenceItems: EvidenceItem[] = await Promise.all(
        evidenceIds.map(async (id) => {
          const item = await sdk.getEvidence(id, sourceAddress);
          const verification = await sdk.getVerification(id, sourceAddress);
          return verification ? { ...item, verification } : item;
        }),
      );

      setEvidence(evidenceItems);

      // 3. Dispute lookup is not yet index-able from an agreement ID —
      //    the contract stores disputes by dispute_id only.  Leaving null
      //    until an indexer or a dedicated agreement→dispute entry is added.
      setDispute(null);
    } catch (e) {
      const err = toAppError(e);
      setError(err.message);
      // Reset data so the page renders the not-found state.
      setAgreement(null);
      setEvidence([]);
      setDispute(null);
    } finally {
      setLoading(false);
    }
  }, [agreementId, sourceAddress]);

  // Run on mount and whenever the agreement ID or source address changes.
  useEffect(() => {
    fetch();
  }, [fetch]);

  return { agreement, evidence, dispute, loading, error, refetch: fetch };
}
