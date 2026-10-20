'use client';

/**
 * EvidenceCard
 *
 * Renders a single evidence item with its optional verification badge.
 * Extracted from the inline map in agreement/[id]/page.tsx so it can be
 * reused, independently styled, and unit-tested.
 *
 * Accepts a `onCopy` callback so the parent controls clipboard feedback
 * (e.g. via useCopyToClipboard) without the component managing its own state.
 */

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import {
  EvidenceType,
  VerificationDecision,
  type Evidence,
  type Verification,
} from '@proofrail/shared';
import { ExternalLink, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EvidenceCardItem extends Evidence {
  /** Populated after the verifier has acted on this evidence. */
  verification?: Verification;
}

interface EvidenceCardProps {
  evidence: EvidenceCardItem;
  /** Called when the user clicks the copy-hash button. */
  onCopy?: (text: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  [EvidenceType.Document]:         'Document',
  [EvidenceType.Image]:            'Image',
  [EvidenceType.Video]:            'Video',
  [EvidenceType.Audio]:            'Audio',
  [EvidenceType.Code]:             'Code',
  [EvidenceType.DeliveryProof]:    'Delivery Proof',
  [EvidenceType.CompletionReport]: 'Completion Report',
  [EvidenceType.Other]:            'Other',
};

function VerificationBadge({ decision }: { decision: VerificationDecision }) {
  if (decision === VerificationDecision.Approved) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (decision === VerificationDecision.Rejected) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" />
      Needs Revision
    </Badge>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EvidenceCard({ evidence, onCopy }: EvidenceCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Header row: type badge + submitter + time */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {EVIDENCE_TYPE_LABEL[evidence.evidenceType]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              by {formatAddress(evidence.submitter)}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(evidence.submittedAt)}
            </span>
          </div>

          {/* Content hash */}
          <p className="truncate font-mono text-xs text-muted-foreground">
            Hash: {evidence.contentHash}
          </p>

          {/* Optional off-chain reference (URL, IPFS CID, etc.) */}
          {evidence.reference && (
            <p className="mt-1 truncate text-sm">
              Reference:{' '}
              <a
                href={evidence.reference}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {evidence.reference}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </p>
          )}

          {/* Verification result if available */}
          {evidence.verification && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerificationBadge decision={evidence.verification.decision} />
              <span className="text-sm text-muted-foreground">
                decided {formatRelativeTime(evidence.verification.decidedAt)} by{' '}
                {formatAddress(evidence.verification.verifier)}
              </span>
            </div>
          )}
        </div>

        {/* Copy hash button */}
        {onCopy && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy content hash"
            onClick={() => onCopy(evidence.contentHash)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
