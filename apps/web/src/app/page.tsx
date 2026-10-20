import { Metadata } from 'next';
import { Hero } from '@/components/layout/Hero';
import { Features } from '@/components/layout/Features';
import { Lifecycle } from '@/components/layout/Lifecycle';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'PROOFRAIL | Evidence-to-Settlement Protocol',
  description: 'A production-minded, database-free protocol for conditional fund release on Stellar/Soroban',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Lifecycle />
      <Footer />
    </main>
  );
}