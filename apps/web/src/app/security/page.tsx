import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Shield, ArrowLeft, Bug, Lock, Eye, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Policy | PROOFRAIL',
  description: 'Security policy, responsible disclosure, and audit status for PROOFRAIL',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Security Policy</h1>
            </div>
            <p className="text-muted-foreground">
              How PROOFRAIL approaches security, vulnerability reporting, and audits.
            </p>
          </div>

          <div className="space-y-6">
            {/* Audit Status */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 shrink-0">
                    <Bug className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-xl font-semibold">Audit Status: Not Audited</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      The PROOFRAIL smart contract has not undergone an independent security audit.
                      The code is experimental and should not be used with real funds on mainnet.
                      An audit will be commissioned before any mainnet deployment is considered.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responsible Disclosure */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Responsible Disclosure</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  If you discover a security vulnerability in PROOFRAIL, please report it
                  responsibly. Do not publicly disclose the issue until it has been addressed.
                </p>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Reporting Process</p>
                    <ol className="mt-1 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Open a private security advisory on the GitHub repository</li>
                      <li>Include a clear description and reproduction steps</li>
                      <li>Allow reasonable time for a fix before any public disclosure</li>
                    </ol>
                  </div>
                  <div>
                    <p className="text-sm font-medium">What to Report</p>
                    <ul className="mt-1 list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Smart contract vulnerabilities (reentrancy, overflow, auth bypass)</li>
                      <li>Logic errors in state transitions or fund movement</li>
                      <li>Frontend issues that could lead to loss of funds or data</li>
                      <li>SDK bugs that could cause incorrect transactions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Measures */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Built-in Security Measures</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="font-medium">Authentication on every mutation</p>
                    <p className="text-sm text-muted-foreground">
                      All contract entry points call <code className="text-xs bg-muted px-1 rounded">require_auth()</code> for the acting party.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">No admin fund access</p>
                    <p className="text-sm text-muted-foreground">
                      The admin key manages protocol metadata only — it has no path to escrowed funds.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Checked arithmetic</p>
                    <p className="text-sm text-muted-foreground">
                      Every balance operation uses checked math to prevent overflow/underflow.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Bounded collections</p>
                    <p className="text-sm text-muted-foreground">
                      Maximum 50 evidence items per agreement prevents unbounded storage growth.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Namespaced storage keys</p>
                    <p className="text-sm text-muted-foreground">
                      <code className="text-xs bg-muted px-1 rounded">StorageKey</code> enum prevents cross-entity ID collisions.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Ledger-based deadlines</p>
                    <p className="text-sm text-muted-foreground">
                      All deadlines use <code className="text-xs bg-muted px-1 rounded">env.ledger().timestamp()</code>, never caller-supplied values.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Security Documentation</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/docs/threat-model">
                    <Button variant="outline" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Threat Model
                    </Button>
                  </Link>
                  <Link href="/docs/contract-api">
                    <Button variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Contract API Reference
                    </Button>
                  </Link>
                  <Link href="/disclaimer">
                    <Button variant="ghost" className="gap-2">
                      Disclaimer
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
