'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  StellarWalletsKit,
  Networks,
  type ModuleInterface,
} from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule, XBULL_ID } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { LobstrModule, LOBSTR_ID } from '@creit.tech/stellar-wallets-kit/modules/lobstr';

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'lobstr';
export type WalletNetwork = 'TESTNET' | 'MAINNET';

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  network: WalletNetwork | null;
  walletType: WalletType | null;
  /** User-facing error from the last wallet operation, cleared by clearError(). */
  error: string | null;
  clearError: () => void;
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (network: WalletNetwork) => Promise<void>;
  /** Sign a base64 transaction XDR with the connected wallet, returning the signed XDR. */
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_IDS: Record<WalletType, string> = {
  freighter: FREIGHTER_ID,
  albedo: ALBEDO_ID,
  xbull: XBULL_ID,
  lobstr: LOBSTR_ID,
};

const STORAGE_KEY = 'proofrail:wallet';

function normalizeNetwork(network: string): WalletNetwork {
  const n = (network || '').toUpperCase();
  return n === 'PUBLIC' || n === 'MAINNET' ? 'MAINNET' : 'TESTNET';
}

function toNetworks(n: WalletNetwork): Networks {
  return n === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;
}

function kitErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return e instanceof Error ? e.message : 'Wallet operation failed';
}

let kitInitialized = false;

function ensureKit() {
  if (kitInitialized) return;
  const modules: ModuleInterface[] = [
    new FreighterModule(),
    new AlbedoModule(),
    new xBullModule(),
    new LobstrModule(),
  ];
  StellarWalletsKit.init({
    modules,
    selectedWalletId: FREIGHTER_ID,
    network: Networks.TESTNET,
  });
  kitInitialized = true;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<WalletNetwork | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applyConnected = useCallback((addr: string, type: WalletType, net: WalletNetwork) => {
    setAddress(addr);
    setWalletType(type);
    setNetwork(net);
    setConnected(true);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Restore previous session (if the wallet still remembers the dapp)
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      let saved: string | null = null;
      try {
        saved = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return;
      }
      if (!saved || !(saved in WALLET_IDS)) return;
      const type = saved as WalletType;
      try {
        ensureKit();
        StellarWalletsKit.setWallet(WALLET_IDS[type]);
        StellarWalletsKit.setNetwork(Networks.TESTNET);
        const mod = StellarWalletsKit.selectedModule;
        const { address: addr } = await mod.getAddress({ skipRequestAccess: true });
        if (cancelled) return;
        const net = await mod.getNetwork().catch(() => ({ network: 'TESTNET' }));
        if (cancelled || !addr) return;
        applyConnected(addr, type, normalizeNetwork(net.network));
      } catch {
        // Wallet not installed / access revoked — stay disconnected
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, [applyConnected]);

  const connect = useCallback(async (walletTypeParam?: WalletType) => {
    setConnecting(true);
    setError(null);
    try {
      ensureKit();
      let addr: string;
      let chosen: WalletType;
      let net: { network: string };

      if (walletTypeParam) {
        chosen = walletTypeParam;
        StellarWalletsKit.setWallet(WALLET_IDS[chosen]);
        const result = await StellarWalletsKit.fetchAddress();
        addr = result.address;
        net = await StellarWalletsKit.getNetwork().catch(() => ({ network: 'TESTNET' }));
      } else {
        const result = await StellarWalletsKit.authModal();
        addr = result.address;
        const selectedId = StellarWalletsKit.selectedModule.productId;
        chosen = (Object.keys(WALLET_IDS) as WalletType[]).find((k) => WALLET_IDS[k] === selectedId) ?? 'freighter';
        net = await StellarWalletsKit.getNetwork().catch(() => ({ network: 'TESTNET' }));
      }

      if (!mounted.current) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, chosen);
      } catch {
        // storage unavailable
      }
      applyConnected(addr, chosen, normalizeNetwork(net.network));
    } catch (e) {
      if (mounted.current) setError(kitErrorMessage(e));
      throw e;
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [applyConnected]);

  const disconnect = useCallback(async () => {
    try {
      ensureKit();
      await StellarWalletsKit.disconnect();
    } catch {
      // local cleanup below is sufficient
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    setAddress(null);
    setNetwork(null);
    setWalletType(null);
    setConnected(false);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async (newNetwork: WalletNetwork) => {
    setNetwork(newNetwork);
    try {
      ensureKit();
      StellarWalletsKit.setNetwork(toNetworks(newNetwork));
      const net = await StellarWalletsKit.getNetwork();
      if (mounted.current) setNetwork(normalizeNetwork(net.network || newNetwork));
    } catch {
      // Wallet controls its own network; local state already updated
    }
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string): Promise<string> => {
      ensureKit();
      const result = await StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase,
        address: address ?? undefined,
      });
      if (!result?.signedTxXdr) {
        throw new Error('Transaction signing was rejected');
      }
      return result.signedTxXdr;
    },
    [address]
  );

  return (
    <WalletContext.Provider value={{
      connected,
      connecting,
      address,
      network,
      walletType,
      error,
      clearError,
      connect,
      disconnect,
      switchNetwork,
      signTransaction,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
