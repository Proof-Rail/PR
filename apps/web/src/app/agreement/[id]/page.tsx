'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Gavel,
  Hash,
  ExternalLink,
  Copy,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatAddress, formatRelativeTime, formatAmount, formatTimestamp } from '@/lib/utils';
import { AgreementState, EvidenceType, VerificationDecision, DisputeState, type Agreement, type Evidence, type Verification, type Dispute } from '@proofrail/shared';
import { getProofrailSdk } from '@/lib/proofrail';

type EvidenceItem = Evidence & { verification?: Verification };

export default function AgreementDetailPage() {
  const { connected, address, network, connect, connecting, error: walletError, clearError } = useWallet();
  const params = useParams();
  const agreementId = params.id as string;
  
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Loads the agreement (and its evidence) through the SDK when a contract is
  // configured; in demo mode there is nothing on-chain to read, so the page
  // falls through to its not-found state.
  const fetchAgreement = async () => {
    const source = address;
    setLoading(true);
    setError(null);
    try {
      const sdk = getProofrailSdk();
      if (!sdk || !source) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setAgreement(null);
        setEvidence([]);
        setDispute(null);
        return;
      }

      const agreementData = await sdk.getAgreement(agreementId, source);
      setAgreement(agreementData);

      const evidenceIds = await sdk.getAgreementEvidence(agreementId, source);
      const evidenceData: EvidenceItem[] = await Promise.all(
        evidenceIds.map(async (id) => {
          const item = await sdk.getEvidence(id, source);
          const verification = await sdk.getVerification(id, source);
          return verification ? { ...item, verification } : item;
        })
      );
      setEvidence(evidenceData);

      // The contract stores disputes by dispute id and exposes no
      // agreement -> dispute index, so a linked dispute is not enumerable yet.
      setDispute(null);
    } catch (err) {
      setError('Failed to load agreement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agreementId) {
      fetchAgreement();
    }
  }, [agreementId, address]);

  const getStateBadge = (state: AgreementState) => {
    const variants: Record<AgreementState, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
      [AgreementState.Created]: 'outline',
      [AgreementState.Funded]: 'info',
      [AgreementState.InProgress]: 'warning',
      [AgreementState.AwaitingVerification]: 'default',
      [AgreementState.Disputed]: 'destructive',
      [AgreementState.Settled]: 'success',
      [AgreementState.Refunded]: 'secondary',
      [AgreementState.Expired]: 'destructive',
    };
    return <Badge variant={variants[state]} className="text-sm">{AgreementState[state]}</Badge>;
  };

  const getEvidenceTypeLabel = (type: EvidenceType) => EvidenceType[type];
  const getVerificationBadge = (decision: VerificationDecision) => {
    const variants: Record<VerificationDecision, 'success' | 'destructive' | 'warning'> = {
      [VerificationDecision.Approved]: 'success',
      [VerificationDecision.Rejected]: 'destructive',
      [VerificationDecision.NeedsRevision]: 'warning',
    };
    return <Badge variant={variants[decision]}>{VerificationDecision[decision]}</Badge>;
  };
  const getDisputeStateBadge = (state: DisputeState) => {
    const variants: Record<DisputeState, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
      [DisputeState.Open]: 'destructive',
      [DisputeState.UnderReview]: 'warning',
      [DisputeState.Resolved]: 'success',
    };
    return <Badge variant={variants[state]}>{DisputeState[state]}</Badge>;
  };

  const isExpired = (deadline: number) => new Date(deadline * 1000) < new Date();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could show toast here
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="p-8 rounded-xl border bg-card">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h1 className="mb-4 text-2xl font-bold">Connect Your Wallet</h1>
              <p className="mb-6 text-muted-foreground">
                To view agreement details, you need to connect a Stellar-compatible wallet.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => connect()} disabled={connecting} className="w-full sm:w-auto">
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
                <Button size="lg" variant="outline" onClick={() => connect('freighter')} disabled={connecting} className="w-full sm:w-auto">
                  Freighter
                </Button>
                <Button size="lg" variant="outline" onClick={() => connect('albedo')} disabled={connecting} className="w-full sm:w-auto">
                  Albedo
                </Button>
              </div>
              {walletError && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{walletError}</span>
                  <button onClick={clearError} className="text-destructive hover:text-destructive/80" aria-label="Dismiss">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Card>
              <CardContent className="py-12 px-8">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h1 className="mb-2 text-2xl font-bold">Agreement Not Found</h1>
                <p className="mb-6 text-muted-foreground">
                  {error || 'The agreement could not be found on the blockchain.'}
                </p>
                <Link href="/dashboard">
                  <Button className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const isPayer = agreement.payer === address;
  const isPayee = agreement.payee === address;
  const isVerifier = agreement.verifier === address;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Agreement Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{agreementId}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {getStateBadge(agreement.state)}
            {isExpired(agreement.deadlines.expiry) && agreement.state !== AgreementState.Settled && agreement.state !== AgreementState.Refunded && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Expired
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Payer</p>
                    <p className="font-mono text-sm flex items-center gap-2">
                      {formatAddress(agreement.payer)}
                      {isPayer && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payee</p>
                    <p className="font-mono text-sm flex items-center gap-2">
                      {formatAddress(agreement.payee)}
                      {isPayee && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verifier</p>
                    <p className="font-mono text-sm flex items-center gap-2">
                      {agreement.verifier ? formatAddress(agreement.verifier) : 'None'}
                      {isVerifier && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Token</p>
                    <p className="font-mono text-sm">{agreement.token.slice(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono text-sm">{formatAmount(agreement.amount)} {agreement.token.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Funded</p>
                    <p className="font-mono text-sm">{formatAmount(agreement.fundedAmount)} / {formatAmount(agreement.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{formatTimestamp(agreement.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Terms Hash</p>
                    <p className="font-mono text-xs flex items-center gap-2">
                      {agreement.termsHash}
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(agreement.termsHash)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Funding Deadline', deadline: agreement.deadlines.fundingDeadline, passed: agreement.state !== AgreementState.Created },
                    { label: 'Evidence Deadline', deadline: agreement.deadlines.evidenceDeadline, passed: agreement.state !== AgreementState.Created && agreement.state !== AgreementState.Funded },
                    { label: 'Verification Deadline', deadline: agreement.deadlines.verificationDeadline, passed: agreement.state === AgreementState.Settled || agreement.state === AgreementState.Refunded || agreement.state === AgreementState.Disputed },
                    { label: 'Settlement Deadline', deadline: agreement.deadlines.settlementDeadline, passed: agreement.state === AgreementState.Settled || agreement.state === AgreementState.Refunded || agreement.state === AgreementState.Disputed },
                    { label: 'Expiry', deadline: agreement.deadlines.expiry, passed: isExpired(agreement.deadlines.expiry) },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between p-3 rounded-lg ${item.passed ? 'bg-muted/50' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Clock className={`h-5 w-5 ${item.passed ? 'text-muted-foreground' : 'text-primary'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono text-sm ${item.passed && !['Settled', 'Refunded'].includes(AgreementState[agreement.state]) ? 'text-destructive' : ''}`}>
                          {formatTimestamp(item.deadline)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.passed ? 'Passed' : formatRelativeTime(item.deadline)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 font-medium">Verification Policy</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Required Evidence Types: {agreement.verificationPolicy.requiredEvidenceTypes.map(getEvidenceTypeLabel).join(', ')}</p>
                    <p>Minimum Evidence Count: {agreement.verificationPolicy.minEvidenceCount}</p>
                    <p>Require All Approved: {agreement.verificationPolicy.requireAllApproved ? 'Yes' : 'No'}</p>
                    <p>Auto-Settle on Approval: {agreement.verificationPolicy.autoSettleOnApproval ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-medium">Dispute Policy</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Allowed Initiators: {agreement.disputePolicy.allowedInitiators.map(formatAddress).join(', ')}</p>
                    <p>Resolver: {agreement.disputePolicy.resolver ? formatAddress(agreement.disputePolicy.resolver) : 'Auto-resolution'}</p>
                    <p>Resolution Deadline: {formatTimestamp(agreement.disputePolicy.resolutionDeadline)}</p>
                    <p>Allow Auto Resolution: {agreement.disputePolicy.allowAutoResolution ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Available Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agreement.state === AgreementState.Created && isPayer && (
                  <Button className="w-full justify-start gap-2" onClick={() => setActiveAction('fund')}>
                    Fund Agreement
                  </Button>
                )}
                {agreement.state === AgreementState.Funded && isPayer && (
                  <Button className="w-full justify-start gap-2" onClick={() => setActiveAction('refund')}>
                    Request Refund
                  </Button>
                )}
                {agreement.state === AgreementState.InProgress && (isPayer || isPayee) && (
                  <Button className="w-full justify-start gap-2" onClick={() => setActiveAction('evidence')}>
                    Submit Evidence
                  </Button>
                )}
                {agreement.state === AgreementState.AwaitingVerification && isVerifier && (
                  <Button className="w-full justify-start gap-2" onClick={() => setActiveAction('verify')}>
                    Verify Evidence
                  </Button>
                )}
                {agreement.state === AgreementState.AwaitingVerification && isPayee && (
                  <Button className="w-full justify-start gap-2 bg-green-500 hover:bg-green-600" onClick={() => setActiveAction('settle')}>
                    Settle Agreement
                  </Button>
                )}
                {(agreement.state === AgreementState.Funded || agreement.state === AgreementState.InProgress || agreement.state === AgreementState.AwaitingVerification) &&
                  address && agreement.disputePolicy.allowedInitiators.includes(address) && (
                  <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => setActiveAction('dispute')}>
                    <Gavel className="h-4 w-4" />
                    Raise Dispute
                  </Button>
                )}
                {dispute && dispute.state === DisputeState.Open && isVerifier && dispute.resolver === address && (
                  <Button className="w-full justify-start gap-2" onClick={() => setActiveAction('resolve')}>
                    Resolve Dispute
                  </Button>
                )}
                {isExpired(agreement.deadlines.expiry) && Number(agreement.fundedAmount) > 0 && 
                  agreement.state !== AgreementState.Settled && agreement.state !== AgreementState.Refunded && (
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setActiveAction('expiry')}>
                    Check Expiry
                  </Button>
                )}
                {(agreement.state === AgreementState.Created ||
                  agreement.state === AgreementState.Funded ||
                  agreement.state === AgreementState.InProgress ||
                  agreement.state === AgreementState.AwaitingVerification) && (
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setActiveAction('view_explorer')}>
                    <ExternalLink className="h-4 w-4" />
                    View on Stellar Expert
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => copyToClipboard(agreementId)}>
                  <Hash className="h-4 w-4" />
                  Copy Agreement ID
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => copyToClipboard(agreement.termsHash)}>
                  <Hash className="h-4 w-4" />
                  Copy Terms Hash
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { /* navigate to tx */ }}>
                  <ExternalLink className="h-4 w-4" />
                  View Creation Transaction
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs for Evidence, Verifications, Disputes */}
        <Tabs defaultValue="evidence" className="mt-6">
          <TabsList>
            <TabsTrigger value="evidence">Evidence ({evidence.length})</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="mt-4">
            {evidence.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No evidence submitted yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {evidence.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getEvidenceTypeLabel(e.evidenceType)}</Badge>
                            <span className="text-sm text-muted-foreground">by {formatAddress(e.submitter)}</span>
                            <span className="text-sm text-muted-foreground">{formatRelativeTime(e.submittedAt)}</span>
                          </div>
                          <p className="text-sm font-mono text-muted-foreground truncate">Hash: {e.contentHash}</p>
                          {e.reference && (
                            <p className="mt-1 text-sm truncate">
                              Reference: <a href={e.reference} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{e.reference} <ExternalLink className="h-3 w-3" /></a>
                            </p>
                          )}
                          {e.verification && (
                            <div className="mt-2 flex items-center gap-2">
                              {getVerificationBadge(e.verification.decision)}
                              <span className="text-sm text-muted-foreground">Decided {formatRelativeTime(e.verification.decidedAt)} by {formatAddress(e.verification.verifier)}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(e.contentHash)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verifications" className="mt-4">
            <p className="text-muted-foreground text-center py-8">Verification history will appear here</p>
          </TabsContent>

          <TabsContent value="disputes" className="mt-4">
            {dispute ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="h-5 w-5" />
                        <span className="font-medium">Dispute Raised</span>
                        {getDisputeStateBadge(dispute.state)}
                      </div>
                      <p className="text-sm text-muted-foreground">Initiator: {formatAddress(dispute.initiator)}</p>
                      <p className="text-sm font-mono text-muted-foreground">Reason Hash: {dispute.reasonHash}</p>
                      <p className="text-sm text-muted-foreground">Created: {formatTimestamp(dispute.createdAt)}</p>
                      {dispute.resolver && (
                        <p className="text-sm text-muted-foreground">Resolver: {formatAddress(dispute.resolver)}</p>
                      )}
                      {dispute.resolution && (
                        <div className="mt-4 p-3 rounded-lg bg-muted">
                          <p className="font-medium">Resolution:</p>
                          <p className="text-sm">Type: {dispute.resolution.type}</p>
                          {dispute.resolution.type === 'Split' ? (
                            <>
                              <p className="text-sm">Payee Amount: {dispute.resolution.payeeAmount}</p>
                              <p className="text-sm">Payer Amount: {dispute.resolution.payerAmount}</p>
                            </>
                          ) : (
                            <p className="text-sm">Amount: {dispute.resolution.amount}</p>
                          )}
                          <p className="text-sm text-muted-foreground">Resolved: {dispute.resolvedAt ? formatTimestamp(dispute.resolvedAt) : 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Gavel className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No disputes raised</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <p className="text-muted-foreground text-center py-8">Activity log will appear here (requires indexer for full history)</p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
