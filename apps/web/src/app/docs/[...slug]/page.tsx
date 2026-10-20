import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, ArrowLeft, Clock, BookOpen } from 'lucide-react';

// ── Slug → metadata + markdown file mapping ──────────────────────────────────

interface DocMeta {
  title: string;
  description: string;
  /** Filename in the project /docs directory, or null if content isn't written yet. */
  file: string | null;
}

const DOC_MAP: Record<string, DocMeta> = {
  // Getting Started
  'quick-start':    { title: 'Quick Start', description: 'Create your first agreement in 5 minutes', file: null },
  'installation':   { title: 'Installation', description: 'Install dependencies and configure the SDK', file: null },
  'testnet-setup':  { title: 'Testnet Setup', description: 'Fund testnet accounts and deploy contracts', file: null },
  // Protocol Design
  'architecture':   { title: 'Architecture Overview', description: 'System architecture and data flow', file: 'ARCHITECTURE.md' },
  'lifecycle':      { title: 'Agreement Lifecycle', description: 'State machine and transitions', file: null },
  'evidence':       { title: 'Evidence & Verification', description: 'How evidence commitments work', file: null },
  'disputes':       { title: 'Dispute Resolution', description: 'Dispute mechanics and resolution', file: null },
  'threat-model':   { title: 'Threat Model', description: 'Security assumptions and mitigations', file: 'THREAT_MODEL.md' },
  // Smart Contracts
  'contract-api':   { title: 'Contract API', description: 'Complete function reference', file: 'CONTRACT_API.md' },
  'deployment':     { title: 'Deployment Guide', description: 'Deploy to testnet and mainnet', file: 'DEPLOYMENT.md' },
  'testing':        { title: 'Testing', description: 'Unit and integration testing', file: null },
  'upgrading':      { title: 'Upgrading', description: 'Contract upgrade patterns', file: null },
  // TypeScript SDK
  'sdk':            { title: 'SDK Reference', description: 'Complete API documentation', file: null },
  'sdk/create':     { title: 'Creating Agreements', description: 'Create and configure agreements', file: null },
  'sdk/evidence':   { title: 'Evidence Workflow', description: 'Submit and verify evidence', file: null },
  'sdk/settlement': { title: 'Settlement & Disputes', description: 'Settle, refund, and resolve disputes', file: null },
  // Additional
  'security':       { title: 'Security & Audits', description: 'Security policy and audit status', file: null },
  'integration':    { title: 'Integration Guide', description: 'Real-world integration patterns', file: null },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function findDocsDir(): string | null {
  const candidates = [
    path.join(process.cwd(), '../../docs'), // cwd = apps/web
    path.join(process.cwd(), 'docs'),        // cwd = project root
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    } catch {
      // ignore
    }
  }
  return null;
}

function slugToString(slug: string[]): string {
  return slug.join('/');
}

function getDocMeta(slugStr: string): DocMeta | null {
  return DOC_MAP[slugStr] ?? null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { slug: string[] };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const meta = getDocMeta(slugToString(params.slug));
  return {
    title: meta ? `${meta.title} | PROOFRAIL Docs` : 'PROOFRAIL Docs',
    description: meta?.description ?? 'PROOFRAIL documentation',
  };
}

export default function DocSlugPage({ params }: PageProps) {
  const slugStr = slugToString(params.slug);
  const meta = getDocMeta(slugStr);

  // Unknown slug — show a generic not-found style page
  if (!meta) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Card>
              <CardContent className="py-12 px-8">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h1 className="mb-2 text-2xl font-bold">Page Not Found</h1>
                <p className="mb-6 text-muted-foreground">
                  The documentation page &ldquo;/{slugStr}&rdquo; doesn&apos;t exist.
                </p>
                <Link href="/docs">
                  <Button className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Docs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Known slug with a markdown file — render the content
  if (meta.file) {
    const docsDir = findDocsDir();
    let htmlContent = '';

    if (docsDir) {
      const filePath = path.join(docsDir, meta.file);
      try {
        const markdown = fs.readFileSync(filePath, 'utf-8');
        htmlContent = marked.parse(markdown, { async: false }) as string;
      } catch {
        htmlContent = '<p>Unable to load documentation content.</p>';
      }
    } else {
      htmlContent = '<p>Documentation directory not found.</p>';
    }

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container-wide py-8">
          <div className="mb-6">
            <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              All Documentation
            </Link>
          </div>
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-2 text-3xl font-bold">{meta.title}</h1>
            <p className="mb-8 text-lg text-muted-foreground">{meta.description}</p>
            <div
              className="doc-content"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </main>
      </div>
    );
  }

  // Known slug but no content yet — coming soon
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-wide py-8">
        <div className="mb-6">
          <Link href="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All Documentation
          </Link>
        </div>
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{meta.title}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <Clock className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium text-foreground">This page is coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    The content for this section is being written. In the meantime, check the
                    available documentation below or the project README.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Available Documentation</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(DOC_MAP)
                    .filter(([, m]) => m.file !== null)
                    .map(([slug, m]) => (
                      <Link
                        key={slug}
                        href={`/docs/${slug}`}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.description}</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
