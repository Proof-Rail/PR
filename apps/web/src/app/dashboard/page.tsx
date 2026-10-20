'use client';

import { useWallet } from '@/components/wallet/WalletProvider';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import { AgreementState, type Agreement } from '@proofrail/shared';

export default function DashboardPage() {
  const { connected, address, network, connect, connecting, error: walletError, clearError } = useWallet();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The contract has no on-chain index of agreements per account, so a full
  // list cannot be enumerated yet. getProofrailSdk() returns null in demo mode.
  // Wrapped in useCallback so the stable reference can be listed as a dep of
  // the effect below, preventing stale-closure bugs.
  const fetchAgreements = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      // TODO: Implement actual blockchain queries via SDK once an indexer is
      // available to enumerate agreements per address.
      // const sdk = getProofrailSdk();
      // const userAgreements = await sdk.getAgreementsForAddress(address);
      // setAgreements(userAgreements);

      // Simulate empty state for now.
      setAgreements([]);
    } catch (err) {
      setError('Failed to load agreements');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      fetchAgreements();
    }
  }, [connected, address, fetchAgreements]);

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
    return <Badge variant={variants[state]}>{AgreementState[state]}</Badge>;
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 p-8 rounded-xl border bg-card">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h1 className="mb-4 text-2xl font-bold">Connect Your Wallet</h1>
              <p className="mb-6 text-muted-foreground">
                To view your agreements and interact with the protocol, you need to connect a Stellar-compatible wallet.
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
            <p className="text-sm text-muted-foreground">
              Supported wallets: Freighter, Albedo, XBULL, Lobstr
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Connected as {formatAddress(address!)} on {network === 'TESTNET' ? 'Testnet' : 'Mainnet'}
            </p>
          </div>
          <Link href="/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Agreement
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Tabs for different agreement categories */}
        <div className="mb-6 flex gap-2 border-b border-border">
          {[
            { key: 'all', label: 'All Agreements' },
            { key: 'created', label: 'Created by Me' },
            { key: 'payee', label: 'Payee' },
            { key: 'verifier', label: 'Verifier' },
            { key: 'action_required', label: 'Action Required' },
          ].map((tab) => (
            <button
              key={tab.key}
              className="pb-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : agreements.length === 0 ? (
          <div className="text-center py-16">
            <Card>
              <CardContent className="py-12 px-8">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="mb-2 text-xl font-semibold">No Agreements Found</h2>
                <p className="mb-6 text-muted-foreground max-w-md mx-auto">
                  You don&apos;t have any agreements yet. Create your first agreement to get started.
                </p>
                <Link href="/create">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Agreement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agreements.map((agreement) => (
              <Card key={agreement.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Agreement</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{agreement.id.slice(0, 16)}...</p>
                    </div>
                    {getStateBadge(agreement.state)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span className="font-medium">
                        {agreement.payer === address ? 'Payer' : agreement.payee === address ? 'Payee' : 'Verifier'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium font-mono">{agreement.fundedAmount} {agreement.token.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatRelativeTime(agreement.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span className={new Date(agreement.deadlines.expiry * 1000) < new Date() ? 'text-destructive' : ''}>
                        {formatRelativeTime(agreement.deadlines.expiry)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex gap-2">
                    <Link
                      href={`/agreement/${agreement.id}`}
                      className="flex-1 text-center text-sm font-medium text-primary hover:text-primary/80"
                    >
                      View Details
                    </Link>
                    {agreement.state === AgreementState.Created && agreement.payer === address && (
                      <Link
                        href={`/agreement/${agreement.id}?action=fund`}
                        className="flex-1 text-center text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md"
                      >
                        Fund
                      </Link>
                    )}
                    {agreement.state === AgreementState.InProgress && (
                      <Link
                        href={`/agreement/${agreement.id}?action=evidence`}
                        className="flex-1 text-center text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md"
                      >
                        Submit Evidence
                      </Link>
                    )}
                    {agreement.state === AgreementState.AwaitingVerification && agreement.verifier === address && (
                      <Link
                        href={`/agreement/${agreement.id}?action=verify`}
                        className="flex-1 text-center text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md"
                      >
                        Verify
                      </Link>
                    )}
                    {agreement.state === AgreementState.AwaitingVerification && agreement.payee === address && (
                      <Link
                        href={`/agreement/${agreement.id}?action=settle`}
                        className="flex-1 text-center text-sm font-medium bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-md"
                      >
                        Settle
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
