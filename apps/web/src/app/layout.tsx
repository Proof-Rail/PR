import type { Metadata } from 'next';
import { WalletProvider } from '@/components/wallet/WalletProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'PROOFRAIL | Evidence-to-Settlement Protocol',
  description: 'A production-minded, database-free protocol for conditional fund release on Stellar/Soroban',
  keywords: ['stellar', 'soroban', 'escrow', 'smart-contracts', 'blockchain', 'evidence', 'settlement'],
  authors: [{ name: 'PROOFRAIL Contributors' }],
  openGraph: {
    title: 'PROOFRAIL | Evidence-to-Settlement Protocol',
    description: 'Build agreements whose funds are released, refunded, or disputed according to verifiable conditions.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}