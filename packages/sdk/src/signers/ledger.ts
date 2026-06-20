import { Signer } from "../types";
import { TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Ledger signer implementation for hardware wallet support.
 * Works in both browser (WebHID) and Node.js (HID) environments.
 */
export class LedgerSigner implements Signer {
  private publicKey: string | null = null;
  private transport: any = null;

  constructor() {
    // No initialization needed here; transport is lazy-loaded
  }

  /**
   * Get or create the appropriate transport based on environment
   */
  private async getTransport(): Promise<any> {
    if (this.transport) {
      return this.transport;
    }

    // Check if we're in a browser or Node.js environment
    if (typeof window !== "undefined") {
      // Browser environment - use WebHID
      try {
        const { default: TransportWebHID } = await import("@ledgerhq/hw-transport-webhid");
        this.transport = await TransportWebHID.create();
      } catch (error) {
        throw new Error(
          `Failed to initialize Ledger WebHID transport: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Node.js environment - use Node HID
      try {
        const { default: TransportNodeHID } = await import("@ledgerhq/hw-transport-node-hid");
        const devices = await TransportNodeHID.list();
        if (devices.length === 0) {
          throw new Error("No Ledger device found. Please connect your Ledger device.");
        }
        this.transport = await TransportNodeHID.open(devices[0]);
      } catch (error) {
        throw new Error(
          `Failed to initialize Ledger Node HID transport: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return this.transport;
  }

  /**
   * Get the public key from the Ledger device
   * @param derivationPath Optional Stellar derivation path (default: "m/44'/148'/0'")
   */
  async getPublicKey(derivationPath: string = "m/44'/148'/0'"): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    try {
      const transport = await this.getTransport();
      const { default: StrApp } = await import("@ledgerhq/hw-app-str");
      const app = new StrApp(transport);

      const result = await app.getPublicKey(derivationPath);
      this.publicKey = result.publicKey;
      return result.publicKey;
    } catch (error) {
      throw new Error(
        `Failed to get public key from Ledger: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sign a transaction using the Ledger device
   * @param tx The transaction to sign (can be a Transaction object or XDR string)
   * @param derivationPath Optional Stellar derivation path (default: "m/44'/148'/0'")
   */
  async signTransaction(tx: any, derivationPath: string = "m/44'/148'/0'"): Promise<any> {
    try {
      const transport = await this.getTransport();
      const { default: StrApp } = await import("@ledgerhq/hw-app-str");
      const app = new StrApp(transport);

      // If tx is a Transaction object, convert to XDR
      const xdrString = typeof tx === "string" ? tx : tx.toEnvelope().toXDR("base64");

      const signature = await app.signTransaction(derivationPath, Buffer.from(xdrString, "base64"));

      // If the original input was a Transaction object, convert back
      if (typeof tx !== "string") {
        const { TransactionBuilder } = await import("@stellar/stellar-sdk");
        // The signature is already integrated by the app.signTransaction
        return TransactionBuilder.fromXDR(signature, tx.networkPassphrase);
      }

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific Ledger errors
      if (errorMessage.includes("device not found") || errorMessage.includes("not connected")) {
        throw new Error("Ledger device not found or not connected");
      }
      if (errorMessage.includes("app not open")) {
        throw new Error("Stellar app not open on Ledger device");
      }
      if (errorMessage.includes("user rejected")) {
        throw new Error("Transaction signing rejected by user");
      }
      if (errorMessage.includes("version")) {
        throw new Error("Ledger app version mismatch or not installed");
      }

      throw new Error(`Failed to sign transaction with Ledger: ${errorMessage}`);
    }
  }

  /**
   * Close the Ledger transport connection
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
        this.transport = null;
      } catch (error) {
        // Silently fail on close
      }
    }
  }
}
