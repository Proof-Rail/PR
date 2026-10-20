'use client';

import Link from 'next/link';
import { useWallet } from '@/components/wallet/WalletProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Menu, X, Wallet as WalletIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { formatAddress } from '@/lib/utils';

export function Header() {
  const { connected, address, network, connect, disconnect, connecting, switchNetwork, error, clearError } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);

  // Opens the wallet-picker modal (no direct wallet type → uses authModal).
  const handleConnectModal = async () => {
    try {
      await connect();
      setWalletMenuOpen(false);
    } catch {
      // Error already captured in wallet state and shown below.
    }
  };

  // Quick-connect to a specific wallet (requires extension for Freighter/xBull/Lobstr).
  const handleConnect = async (type: 'freighter' | 'albedo' | 'xbull' | 'lobstr') => {
    try {
      await connect(type);
      setWalletMenuOpen(false);
    } catch {
      // Error already captured in wallet state and shown below.
    }
  };

  const handleSwitchNetwork = async (newNetwork: 'TESTNET' | 'MAINNET') => {
    try {
      await switchNetwork(newNetwork === 'TESTNET' ? 'TESTNET' : 'MAINNET');
      setWalletMenuOpen(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-wide flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            PROOFRAIL
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#lifecycle" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {connected ? (
              <div className="relative">
                <button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <WalletIcon className="h-4 w-4" />
                  <span>{formatAddress(address || '')}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {walletMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card p-2 shadow-lg animate-slide-down">
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Network: {network === 'TESTNET' ? 'Testnet' : 'Mainnet'}
                    </div>
                    <button
                      onClick={() => handleSwitchNetwork(network === 'TESTNET' ? 'MAINNET' : 'TESTNET')}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
                    >
                      {network === 'TESTNET' ? 'Switch to Mainnet' : 'Switch to Testnet'}
                    </button>
                    <hr className="my-2 border-border" />
                    <button
                      onClick={disconnect}
                      className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleConnect('freighter')} disabled={connecting}>
                  Freighter
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleConnect('albedo')} disabled={connecting}>
                  Albedo
                </Button>
                <Button variant="primary" size="sm" onClick={handleConnectModal} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Wallet error banner — shown when a connect/sign operation fails */}
      {error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2">
          <div className="container-wide flex items-center justify-between gap-3">
            <p className="text-sm text-destructive flex items-center gap-2">
              <WalletIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{error}</span>
            </p>
            <button
              onClick={clearError}
              className="text-destructive hover:text-destructive/80 shrink-0"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border py-4 animate-slide-down">
          <nav className="flex flex-col gap-4">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="#lifecycle" className="text-sm font-medium text-muted-foreground hover:text-foreground">How It Works</Link>
            <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground">Docs</Link>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">Dashboard</Link>
            <div className="pt-4 border-t border-border">
              {connected ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Connected: {formatAddress(address || '')}</p>
                  <p className="text-sm text-muted-foreground">Network: {network === 'TESTNET' ? 'Testnet' : 'Mainnet'}</p>
                  <Button variant="outline" className="w-full" onClick={disconnect}>Disconnect</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="primary" className="w-full" onClick={handleConnectModal} disabled={connecting}>
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full" onClick={() => handleConnect('freighter')} disabled={connecting}>
                      Freighter
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => handleConnect('albedo')} disabled={connecting}>
                      Albedo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}