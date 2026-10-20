'use client';

/**
 * AgreementCard
 *
 * Compact summary card used in the Dashboard grid.  Extracted from the inline
 * JSX in dashboard/page.tsx so it can be reused, tested, and styled in
 * isolation.
 *
 * Receives only the data it needs — no SDK calls inside.
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AgreementStateBadge } from './AgreementStateBadge';
import { formatAddress, formatRelativeTime, formatAmount } from '@/lib/utils';
import { AgreementState, type Agreement } from '@proofrail/shared';

interface AgreementCardProps {
  agreement: Agreement;
  /** The connected wallet address — used to derive the viewer's role. */
  viewerAddress: string;
}

export function AgreementCard({ agreement, viewerAddress }: AgreementCardProps) {
  const isPayer    = agreement.payer   === viewerAddress;
  const isPayee    = agreement.payee   === viewerAddress;
  const isVerifier = agreement.verifier === viewerAddress;

  const role = isPayer ? 'Payer' : isPayee ? 'Payee' : isVerifier ? 'Verifier' : 'Observer';

  const isExpired = new Date(agreement.deadlines.expiry * 1000) < new Date();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">Agreement</CardTitle>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {agreement.id.slice(0, 16)}…
            </p>
          </div>
          <AgreementStateBadge state={agreement.state} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key fields */}
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-medium">{role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-mono font-medium">
              {formatAmount(agreement.fundedAmount || agreement.amount)}
              &nbsp;
              <span className="text-muted-foreground">{agreement.token.slice(0, 8)}…</span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatRelativeTime(agreement.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Expires</dt>
            <dd className={isExpired ? 'text-destructive' : ''}>
              {formatRelativeTime(agreement.deadlines.expiry)}
            </dd>
          </div>
        </dl>

        {/* Context-sensitive action strip */}
        <div className="flex gap-2 border-t border-border pt-2">
          {/* Always-present detail link */}
          <Link
            href={`/agreement/${agreement.id}`}
            className="flex-1 text-center text-sm font-medium text-primary hover:text-primary/80"
          >
            View Details
          </Link>

          {/* Fund: visible only when not yet funded (Created state, payer POV) */}
          {agreement.state === AgreementState.Created && isPayer && (
            <Link
              href={`/agreement/${agreement.id}?action=fund`}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Fund
            </Link>
          )}

          {/* Submit evidence while work is in progress */}
          {agreement.state === AgreementState.InProgress && (
            <Link
              href={`/agreement/${agreement.id}?action=evidence`}
              className="flex-1 rounded-md bg-secondary px-3 py-1.5 text-center text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              Submit Evidence
            </Link>
          )}

          {/* Verify: visible only to the verifier when ready */}
          {agreement.state === AgreementState.AwaitingVerification && isVerifier && (
            <Link
              href={`/agreement/${agreement.id}?action=verify`}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Verify
            </Link>
          )}

          {/* Settle: visible only to the payee when verification is complete */}
          {agreement.state === AgreementState.AwaitingVerification && isPayee && (
            <Link
              href={`/agreement/${agreement.id}?action=settle`}
              className="flex-1 rounded-md bg-green-500 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-green-600"
            >
              Settle
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
