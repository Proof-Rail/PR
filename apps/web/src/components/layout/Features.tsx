'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  FileText,
  Gavel,
  Clock,
  Link as LinkIcon,
  Code,
  Users,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'On-Chain Escrow',
    description: 'Funds held securely in Soroban smart contracts with explicit state transitions. No intermediary can access funds without meeting contract conditions.',
    tag: 'Core',
  },
  {
    icon: FileText,
    title: 'Evidence Commitments',
    description: 'Submit cryptographic hashes of off-chain evidence (documents, images, delivery proofs). Files stay off-chain; only commitments go on-chain.',
    tag: 'Evidence',
  },
  {
    icon: Gavel,
    title: 'Authorized Verification',
    description: 'Designated verifiers attest to evidence with on-chain decisions. Approvals, rejections, and revision requests are permanently recorded.',
    tag: 'Verification',
  },
  {
    icon: Users,
    title: 'Structured Disputes',
    description: 'Parties can raise disputes with reason commitments. Authorized resolvers execute binding resolutions with capped distributions.',
    tag: 'Disputes',
  },
  {
    icon: Clock,
    title: 'Deadline Enforcement',
    description: 'Funding, evidence, verification, and settlement deadlines enforced on-chain. Automatic expiry handling with configurable refund rules.',
    tag: 'Deadlines',
  },
  {
    icon: LinkIcon,
    title: 'Multi-Token Support',
    description: 'Works with any Soroban-compatible token (native XLM, USDC, custom assets). Token validation on funding prevents mismatches.',
    tag: 'Tokens',
  },
  {
    icon: Code,
    title: 'TypeScript SDK',
    description: 'Fully typed client library for agreement creation, funding, evidence submission, verification, settlement, and dispute resolution.',
    tag: 'Developers',
  },
  {
    icon: Globe,
    title: 'Database-Free',
    description: 'All authoritative state on-chain. No database, no Supabase, no SQL. Frontend reads directly from Soroban RPC.',
    tag: 'Architecture',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-muted/30">
      <div className="container-wide">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Protocol Features
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for developers who need reliable, auditable conditional settlement infrastructure.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="h-full transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <Badge variant="outline" className="text-xs">{feature.tag}</Badge>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}