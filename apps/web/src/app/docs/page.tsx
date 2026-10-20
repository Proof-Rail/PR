'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { FileText, Code, Shield, AlertTriangle, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Set up your development environment and create your first agreement',
    icon: FileText,
    pages: [
      { title: 'Quick Start', href: '/docs/quick-start', description: 'Create your first agreement in 5 minutes' },
      { title: 'Installation', href: '/docs/installation', description: 'Install dependencies and configure the SDK' },
      { title: 'Testnet Setup', href: '/docs/testnet-setup', description: 'Fund testnet accounts and deploy contracts' },
    ],
  },
  {
    id: 'protocol',
    title: 'Protocol Design',
    description: 'Understand the core concepts and architecture',
    icon: Shield,
    pages: [
      { title: 'Architecture Overview', href: '/docs/architecture', description: 'System architecture and data flow' },
      { title: 'Agreement Lifecycle', href: '/docs/lifecycle', description: 'State machine and transitions' },
      { title: 'Evidence & Verification', href: '/docs/evidence', description: 'How evidence commitments work' },
      { title: 'Dispute Resolution', href: '/docs/disputes', description: 'Dispute mechanics and resolution' },
      { title: 'Threat Model', href: '/docs/threat-model', description: 'Security assumptions and mitigations' },
    ],
  },
  {
    id: 'contracts',
    title: 'Smart Contracts',
    description: 'Soroban contract reference and deployment',
    icon: Code,
    pages: [
      { title: 'Contract API', href: '/docs/contract-api', description: 'Complete function reference' },
      { title: 'Deployment Guide', href: '/docs/deployment', description: 'Deploy to testnet and mainnet' },
      { title: 'Testing', href: '/docs/testing', description: 'Unit and integration testing' },
      { title: 'Upgrading', href: '/docs/upgrading', description: 'Contract upgrade patterns' },
    ],
  },
  {
    id: 'sdk',
    title: 'TypeScript SDK',
    description: 'Client library for interacting with PROOFRAIL',
    icon: FileText,
    pages: [
      { title: 'SDK Reference', href: '/docs/sdk', description: 'Complete API documentation' },
      { title: 'Creating Agreements', href: '/docs/sdk/create', description: 'Create and configure agreements' },
      { title: 'Evidence Workflow', href: '/docs/sdk/evidence', description: 'Submit and verify evidence' },
      { title: 'Settlement & Disputes', href: '/docs/sdk/settlement', description: 'Settle, refund, and resolve disputes' },
    ],
  },
  {
    id: 'guides',
    title: 'Integration Guides',
    description: 'Real-world integration patterns',
    icon: ExternalLink,
    pages: [
      { title: 'Freelance Platform', href: '/guides/freelance', description: 'Milestone-based payments for freelancers' },
      { title: 'E-commerce Delivery', href: '/guides/ecommerce', description: 'Proof of delivery for physical goods' },
      { title: 'Grant Distribution', href: '/guides/grants', description: 'Milestone-based grant disbursement' },
      { title: 'API Services', href: '/guides/api-services', description: 'Automated service payments' },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-12">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Documentation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Complete documentation for building with PROOFRAIL. Start with the quick start guide or browse by topic.
          </p>
        </div>

        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="w-full justify-start flex-wrap gap-2">
            {docSections.map((section) => (
              <TabsTrigger key={section.id} value={section.id} className="gap-2">
                <section.icon className="h-4 w-4" />
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {docSections.map((section) => (
            <TabsContent key={section.id} value={section.id}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {section.pages.map((page) => (
                  <Card key={page.href} className="transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{page.title}</CardTitle>
                          <CardDescription>{page.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{section.title}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={page.href} className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
                        Read Guide
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Additional Resources */}
        <div className="mt-16 space-y-8">
          <div>
            <h2 className="mb-6 text-2xl font-bold">Additional Resources</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Contract Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    View the Soroban smart contract source code on GitHub.
                  </p>
                  <Link href="https://github.com/proofrail/proofrail/tree/main/contracts/proofrail_escrow" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
                    View on GitHub
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security & Audits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    Review our threat model, security policy, and audit status.
                  </p>
                  <Link href="/docs/security" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
                    Security Documentation
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Disclaimer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-muted-foreground">
                    Important: This is experimental testnet software. Read our disclaimer before use.
                  </p>
                  <Link href="/disclaimer" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium">
                    Read Disclaimer
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}