'use client';

import Link from 'next/link';
import { Github, Twitter, MessageCircle, Shield, FileText, Code } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container-wide py-12 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              PROOFRAIL
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Evidence-to-settlement protocol on Stellar/Soroban. Build agreements whose funds are released, refunded, or disputed according to verifiable conditions.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="https://github.com/proofrail" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://twitter.com/proofrail" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://discord.gg/proofrail" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Protocol</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs/architecture" className="hover:text-foreground transition-colors">Architecture</Link></li>
              <li><Link href="/docs/contract-api" className="hover:text-foreground transition-colors">Contract API</Link></li>
              <li><Link href="/docs/threat-model" className="hover:text-foreground transition-colors">Threat Model</Link></li>
              <li><Link href="/docs/deployment" className="hover:text-foreground transition-colors">Deployment Guide</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Developers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/docs/sdk" className="hover:text-foreground transition-colors">TypeScript SDK</Link></li>
              <li><Link href="/docs/integration" className="hover:text-foreground transition-colors">Integration Guide</Link></li>
              <li><Link href="/docs/testing" className="hover:text-foreground transition-colors">Testing</Link></li>
              <li><Link href="https://github.com/proofrail/proofrail" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" />
                GitHub Repository
              </Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal & Security</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link></li>
              <li><Link href="/security" className="hover:text-foreground transition-colors">Security Policy</Link></li>
              <li><Link href="/license" className="hover:text-foreground transition-colors">MIT License</Link></li>
              <li><Link href="/contributing" className="hover:text-foreground transition-colors">Contributing</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 PROOFRAIL Contributors. Open source under MIT License.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Testnet Only
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                No Mainnet Deployment
              </span>
              <span className="flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5" />
                Experimental Software
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}