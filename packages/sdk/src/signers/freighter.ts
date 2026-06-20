import { Signer } from "../types";

/**
 * Freighter signer implementation for browser extension.
 * Works with the Freighter Stellar wallet browser extension.
 */
export class FreighterSigner implements Signer {
  private publicKey: string | null = null;

  constructor() {
    this.validateFreighterAvailability();
  }

  private validateFreighterAvailability(): void {
    if (typeof window === "undefined") {
      throw new Error("Freighter is only available in a browser environment");
    }
    if (!(window as any).freighter) {
      throw new Error("Freighter extension not found. Please install it from https://www.freighter.app/");
    }
  }

  /**
   * Get the public key from Freighter
   */
  async getPublicKey(): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    const freighter = (window as any).freighter;
    try {
      const publicKey = await freighter.getPublicKey();
      this.publicKey = publicKey;
      return publicKey;
    } catch (error) {
      throw new Error(`Failed to get public key from Freighter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sign a transaction using Freighter
   * @param tx The transaction to sign (can be a Transaction object or XDR string)
   */
  async signTransaction(tx: any): Promise<any> {
    const freighter = (window as any).freighter;
    try {
      // If tx is a Transaction object, convert to XDR
      const xdrString = typeof tx === "string" ? tx : tx.toEnvelope().toXDR("base64");
      const signedXdr = await freighter.signTransaction(xdrString);
      
      // If the original input was a Transaction object, convert back
      if (typeof tx !== "string") {
        const { TransactionBuilder } = await import("@stellar/stellar-sdk");
        // Parse the signed XDR back into a Transaction
        return TransactionBuilder.fromXDR(signedXdr, tx.networkPassphrase);
      }
      
      return signedXdr;
    } catch (error) {
      throw new Error(`Failed to sign transaction with Freighter: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
