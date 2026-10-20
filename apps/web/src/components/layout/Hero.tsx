'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Shield, FileText, Clock, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
      <div className="container-wide">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="info" className="mb-6 inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live on Stellar Testnet
          </Badge>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Evidence-to-Settlement <br />
            <span className="text-primary">Protocol</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            PROOFRAIL enables applications to create agreements whose funds are released,
            refunded, or disputed according to verifiable conditions — without trusted intermediaries.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/create">
              <Button size="xl" className="gap-2">
                Create Agreement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="xl" variant="outline" className="gap-2">
                Read Documentation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              No Database
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Open Source
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Testnet Ready
            </span>
            <span className="flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              Stellar/Soroban
            </span>
          </div>
        </div>

        {/* Demo/Preview Card */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          <Card className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">proofrail_escrow.wasm</span>
                </div>
                <Badge variant="success">Deployed</Badge>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-green-500">$</span>
                  <span>stellar contract deploy \\</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground pl-6">
                  <span className="text-green-500">$</span>
                  <span>--wasm target/wasm32-unknown-unknown/release/proofrail_escrow.wasm \\</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground pl-6">
                  <span className="text-green-500">$</span>
                  <span>--source alice --network testnet</span>
                </div>
                <div className="pt-2 border-t border-border flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-foreground">Contract deployed: <span className="font-mono">CA7B...K3M2</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}