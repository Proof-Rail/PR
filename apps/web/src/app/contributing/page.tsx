import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, GitPullRequest, Terminal, CheckCircle, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contributing | PROOFRAIL',
  description: 'Guidelines for contributing to the PROOFRAIL project',
};

export default function ContributingPage() {
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
              <GitPullRequest className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Contributing</h1>
            </div>
            <p className="text-muted-foreground">
              Contributions are welcome. Here&apos;s how to get involved.
            </p>
          </div>

          <div className="space-y-6">
            {/* Before You Start */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-semibold">Before You Start</h2>
                <p className="text-muted-foreground leading-relaxed">
                  For significant changes (new features, contract modifications, architecture
                  shifts), please open an issue first to discuss the approach. This saves
                  everyone time and ensures your work aligns with the project&apos;s direction.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Small fixes — typos, bug fixes, documentation improvements — can go straight
                  to a pull request without prior discussion.
                </p>
              </CardContent>
            </Card>

            {/* Development Setup */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Development Setup</h2>
                </div>
                <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
                  <code className="text-sm font-mono text-muted-foreground">{`# Clone and install
git clone https://github.com/proofrail/proofrail.git
cd proofrail
npm install

# Build all packages (shared → sdk → web)
npm run build

# Run lint and tests
npm run lint
npm run test

# Start the dev server (demo mode)
npm run dev    # http://localhost:3000

# Contract only (requires Rust toolchain)
rustup target add wasm32-unknown-unknown
npm run contracts:build
npm run contracts:test`}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Pull Request Checklist */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Pull Request Checklist</h2>
                </div>
                <ol className="space-y-2">
                  {[
                    'Fork the repository and create a feature branch from main',
                    'Run npm run build — it must succeed (shared → sdk → web, in order)',
                    'Run npm run lint — no new warnings or errors',
                    'Run npm run test — all tests pass',
                    'If your change touches the contract: run npm run contracts:build && npm run contracts:test',
                    'Keep PRs focused — one concern per pull request',
                    'Document any new public API: SDK methods, contract entry points, or environment variables',
                    'Write a clear PR description explaining what changed and why',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Code Standards */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Code Standards</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-medium">TypeScript</p>
                    <p className="text-sm text-muted-foreground">
                      Strict mode, no implicit any. Use the existing ESLint config. Prefer
                      interfaces for object shapes, Zod for runtime validation.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Rust</p>
                    <p className="text-sm text-muted-foreground">
                      Follow Soroban conventions. Use <code className="text-xs bg-muted px-1 rounded">#[contracttype]</code> for
                      all on-chain types. Keep <code className="text-xs bg-muted px-1 rounded">#![no_std]</code> — no std
                      dependencies.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Commits</p>
                    <p className="text-sm text-muted-foreground">
                      Use clear, conventional commit messages. Reference issue numbers where
                      applicable (e.g. <code className="text-xs bg-muted px-1 rounded">Fix #123: ...</code>).
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Testing</p>
                    <p className="text-sm text-muted-foreground">
                      New features should include tests. Bug fixes should include a test that
                      reproduces the bug. The project uses Vitest for JS and cargo test for Rust.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <div className="flex flex-wrap gap-4">
              <Link href="/docs">
                <Button variant="outline" className="gap-2">
                  Browse Documentation
                </Button>
              </Link>
              <Link href="/security">
                <Button variant="ghost" className="gap-2">
                  Security Policy
                </Button>
              </Link>
              <Link href="/license">
                <Button variant="ghost" className="gap-2">
                  MIT License
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
