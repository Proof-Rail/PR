import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer | PROOFRAIL',
  description: 'Important legal disclaimer for PROOFRAIL experimental software',
};

export default function DisclaimerPage() {
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
              <AlertTriangle className="h-8 w-8 text-warning" />
              <h1 className="text-3xl font-bold">Disclaimer</h1>
            </div>
            <p className="text-muted-foreground">
              Please read this carefully before using PROOFRAIL.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6 p-6">
              <section>
                <h2 className="mb-2 text-xl font-semibold">Experimental Software</h2>
                <p className="text-muted-foreground leading-relaxed">
                  PROOFRAIL is experimental, open-source software targeting the Stellar Testnet.
                  It has not been independently audited, and its smart contract has not been
                  formally verified. You should not rely on it for anything of value, and you
                  should not deploy it to mainnet without a thorough independent security audit.
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-xl font-semibold">No Warranty</h2>
                <p className="text-muted-foreground leading-relaxed">
                  This software is provided &ldquo;as is&rdquo;, without warranty of any kind,
                  express or implied, including but not limited to the warranties of
                  merchantability, fitness for a particular purpose and non-infringement. In no
                  event shall the authors or copyright holders be liable for any claim, damages
                  or other liability, whether in an action of contract, tort or otherwise,
                  arising from, out of or in connection with the software or the use or other
                  dealings in the software.
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-xl font-semibold">Testnet Assets Have No Value</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All transactions on Stellar Testnet use testnet assets that have no monetary
                  value. Testnet accounts and balances can be reset at any time. Do not confuse
                  testnet operations with mainnet transactions involving real funds.
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-xl font-semibold">No Financial Advice</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Nothing in this software, its documentation, or its user interface constitutes
                  financial, legal, or tax advice. PROOFRAIL is a software tool, not a financial
                  product or service. Consult appropriate professionals for advice specific to
                  your situation.
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-xl font-semibold">Smart Contract Risk</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Smart contracts are immutable once deployed. Bugs or vulnerabilities in the
                  contract code could result in permanent loss of funds. Despite the security
                  measures described in our{' '}
                  <Link href="/docs/threat-model" className="text-primary hover:underline">
                    threat model
                  </Link>
                  , no software is risk-free. You acknowledge and accept these risks by using
                  PROOFRAIL.
                </p>
              </section>

              <section>
                <h2 className="mb-2 text-xl font-semibold">Not Mainnet Ready</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The contract has not been deployed to Stellar Mainnet. The web application
                  runs in demo mode by default. Do not modify environment configuration to
                  target mainnet without first completing a full audit and deployment review.
                </p>
              </section>

              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <Shield className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm text-muted-foreground">
                  By using this software you acknowledge that you have read and understood this
                  disclaimer, and you accept the risks associated with experimental blockchain
                  software.
                </p>
              </div>

              <div className="flex gap-4">
                <Link href="/docs/threat-model">
                  <Button variant="outline" className="gap-2">
                    Read the Threat Model
                  </Button>
                </Link>
                <Link href="/license">
                  <Button variant="ghost" className="gap-2">
                    View MIT License
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
