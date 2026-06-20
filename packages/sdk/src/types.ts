/**
 * Types representing the data structures returned by the smart contracts
 */

export interface Profile {
  address: string;
  username: string;
  creator_token: string;
  bio?: string | null;
}

export interface Post {
  id: number;
  author: string;
  content: string;
  tip_total: number;
  timestamp: number;
  like_count: number;
}

export interface Pool {
  pool_id: string;
  token: string;
  balance: bigint;
  admins: string[];
  threshold: number;
}

/**
 * Ledger footprint describing read and write entries touched by a transaction.
 */
export interface LedgerFootprint {
  readOnly?: string[];
  readWrite?: string[];
}

/**
 * Result of simulating a transaction without submitting it.
 */
export interface SimulationResult {
  success: boolean;
  resourceFee: string;
  footprint?: LedgerFootprint;
  error?: string;
  eventLog?: unknown;
}

/**
 * Interface for transaction signers (e.g., Freighter, Ledger, etc.)
 */
export interface Signer {
  /**
   * Get the public key associated with this signer.
   * @param derivationPath Optional derivation path for hardware wallets (e.g. "m/44'/148'/0'")
   */
  getPublicKey(derivationPath?: string): Promise<string>;

  /**
   * Sign a transaction envelope.
   * @param tx The transaction to sign
   * @param derivationPath Optional derivation path for hardware wallets
   */
  signTransaction(tx: any, derivationPath?: string): Promise<any>;
}
