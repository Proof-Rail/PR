import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'MIT License | PROOFRAIL',
  description: 'MIT open-source license for the PROOFRAIL project',
};

export default function LicensePage() {
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
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">MIT License</h1>
            </div>
            <p className="text-muted-foreground">
              PROOFRAIL is open-source software released under the MIT License.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground">
{`MIT License

Copyright (c) 2026 PROOFRAIL Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
              </pre>
            </CardContent>
          </Card>

          <div className="mt-6 flex gap-4">
            <Link href="/disclaimer">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Read Disclaimer
              </Button>
            </Link>
            <Link href="/contributing">
              <Button variant="ghost" className="gap-2">
                Contributing Guidelines
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
