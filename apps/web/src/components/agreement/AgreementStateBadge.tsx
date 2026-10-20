/**
 * AgreementStateBadge
 *
 * Renders a coloured Badge for any AgreementState value.  Centralises the
 * state→variant mapping that was previously duplicated in dashboard/page.tsx
 * and agreement/[id]/page.tsx.
 */

import { Badge } from '@/components/ui/Badge';
import { AgreementState } from '@proofrail/shared';
import { AGREEMENT_STATE_VARIANT } from '@/types';

interface AgreementStateBadgeProps {
  state: AgreementState;
  className?: string;
}

/** Human-readable label for each state. */
const STATE_LABEL: Record<AgreementState, string> = {
  [AgreementState.Created]:              'Created',
  [AgreementState.Funded]:               'Funded',
  [AgreementState.InProgress]:           'In Progress',
  [AgreementState.AwaitingVerification]: 'Awaiting Verification',
  [AgreementState.Disputed]:             'Disputed',
  [AgreementState.Settled]:              'Settled',
  [AgreementState.Refunded]:             'Refunded',
  [AgreementState.Expired]:              'Expired',
};

export function AgreementStateBadge({ state, className }: AgreementStateBadgeProps) {
  return (
    <Badge variant={AGREEMENT_STATE_VARIANT[state]} className={className}>
      {STATE_LABEL[state]}
    </Badge>
  );
}
