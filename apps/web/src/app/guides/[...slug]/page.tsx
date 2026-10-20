import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Compass, Clock } from 'lucide-react';

// ── Guide metadata ────────────────────────────────────────────────────────────

interface GuideMeta {
  title: string;
  description: string;
}

const GUIDE_MAP: Record<string, GuideMeta> = {
  'freelance':    { title: 'Freelance Platform', description: 'Milestone-based payments for freelancers' },
  'ecommerce':    { title: 'E-commerce Delivery', description: 'Proof of delivery for physical goods' },
  'grants':       { title: 'Grant Distribution', description: 'Milestone-based grant disbursement' },
  'api-services': { title: 'API Services', description: 'Automated service payments' },
};

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { slug: string[] };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const meta = GUIDE_MAP[params.slug.join('/')];
  return {
    title: meta ? `${meta.title} | PROOFRAIL Guides` : 'PROOFRAIL Guides',
    description: meta?.description ?? 'PROOFRAIL integration guides',
  };
}

export default function GuideSlugPage({ params }: PageProps) {
  const slugStr = params.slug.join('/');
  const meta = GUIDE_MAP[slugStr];

  const title = meta?.title ?? 'Integration Guide';
  const description = meta?.description ?? 'Real-world integration patterns for PROOFRAIL.';

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
                  <Compass className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <Clock className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium text-foreground">This guide is coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;re putting together a detailed integration guide for this use case.
                    In the meantime, the SDK documentation and the project README have everything
                    you need to get started.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/docs">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Browse Docs
                  </Button>
                </Link>
                <Link href="/create">
                  <Button className="gap-2">
                    Try the Create Wizard
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
