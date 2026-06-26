"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { isConnected, isConnecting, error, connect, disconnect, publicKey } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isConnected && publicKey) {
    return (
      <div style={styles.container}>
        <div style={styles.addressBadge}>
          <span style={styles.address} data-testid="wallet-address" title={publicKey}>
            {truncateAddress(publicKey)}
          </span>
          <button
            onClick={handleCopy}
            style={styles.copyButton}
            aria-label={copied ? "Address copied" : "Copy wallet address"}
            title={copied ? "Copied!" : "Copy address"}
            data-testid="copy-wallet-address"
          >
            {copied ? "✓" : "⧉"}
          </button>
        </div>
        <button onClick={disconnect} style={styles.disconnectButton} data-testid="disconnect-wallet">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button
        onClick={connect}
        disabled={isConnecting}
        style={styles.connectButton}
        data-testid="connect-wallet"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-md)",
  },
  connectButton: {
    padding: "var(--spacing-sm) var(--spacing-lg)",
    background: "var(--color-primary)",
    color: "white",
    borderRadius: "8px",
    fontWeight: 600,
    transition: "background 0.2s",
    minHeight: "var(--min-touch-target)",
  },
  disconnectButton: {
    padding: "var(--spacing-sm) var(--spacing-md)",
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontWeight: 500,
    transition: "all 0.2s",
    minHeight: "var(--min-touch-target)",
  },
  addressBadge: {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-xs)",
    padding: "var(--spacing-sm) var(--spacing-md)",
    background: "var(--color-bg-secondary)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    fontFamily: "monospace",
  },
  address: {
    fontWeight: 500,
  },
  copyButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
    lineHeight: 1,
    padding: "2px",
    color: "var(--color-text-secondary)",
  },
  error: {
    color: "var(--color-like)",
    fontSize: "0.85rem",
    marginTop: "var(--spacing-xs)",
  },
};