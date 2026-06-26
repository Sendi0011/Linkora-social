import { Signer } from "../types";

interface LedgerTransport {
  close(): Promise<void>;
}

/**
 * Ledger signer implementation for hardware wallet support.
 * Works in both browser (WebHID) and Node.js (HID) environments.
 */
export class LedgerSigner implements Signer {
  private publicKeyCache: Map<string, string> = new Map();
  private transport: LedgerTransport | null = null;

  constructor() {
    // Transport is lazy-loaded on first use
  }

  /**
   * Get or create the appropriate transport based on environment.
   */
  private async getTransport(): Promise<LedgerTransport> {
    if (this.transport) {
      return this.transport;
    }

    if (typeof window !== "undefined") {
      try {
        const { default: TransportWebHID } = await import("@ledgerhq/hw-transport-webhid");
        this.transport = await TransportWebHID.create();
      } catch (error) {
        throw new Error(
          `Failed to initialize Ledger WebHID transport: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
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

    return this.transport as LedgerTransport;
  }

  /**
   * Get the public key from the Ledger device.
   * Results are cached per derivation path. The cache is invalidated on close().
   *
   * @param derivationPath Stellar BIP-44 derivation path (default: "m/44'/148'/0'")
   */
  async getPublicKey(derivationPath: string = "m/44'/148'/0'"): Promise<string> {
    const cached = this.publicKeyCache.get(derivationPath);
    if (cached) return cached;

    try {
      const transport = await this.getTransport();
      const { default: StrApp } = await import("@ledgerhq/hw-app-str");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const app = new StrApp(transport as any);

      const result = await app.getPublicKey(derivationPath);
      this.publicKeyCache.set(derivationPath, result.publicKey);
      return result.publicKey;
    } catch (error) {
      throw new Error(
        `Failed to get public key from Ledger: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Sign a transaction using the Ledger device.
   *
   * The @ledgerhq/hw-app-str signTransaction call returns a raw 64-byte Ed25519
   * signature (not a signed XDR envelope). This method attaches that signature
   * as a DecoratedSignature on the transaction and returns the modified object.
   *
   * @param tx Transaction object or base64 XDR string
   * @param derivationPath Stellar BIP-44 derivation path (default: "m/44'/148'/0'")
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTransaction(tx: any, derivationPath: string = "m/44'/148'/0'"): Promise<any> {
    try {
      const transport = await this.getTransport();
      const { default: StrApp } = await import("@ledgerhq/hw-app-str");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const app = new StrApp(transport as any);

      const xdrString = typeof tx === "string" ? tx : tx.toEnvelope().toXDR("base64");
      const txBytes = Buffer.from(xdrString, "base64");

      // Ledger returns { signature: Buffer } — a 64-byte raw Ed25519 signature,
      // not a signed XDR envelope. Attach it to the transaction as a DecoratedSignature.
      const { signature } = await app.signTransaction(derivationPath, txBytes);

      if (typeof tx !== "string") {
        const { Keypair, xdr } = await import("@stellar/stellar-sdk");
        const publicKey = await this.getPublicKey(derivationPath);
        const keypair = Keypair.fromPublicKey(publicKey);
        tx.signatures.push(
          new xdr.DecoratedSignature({
            hint: keypair.signatureHint(),
            signature,
          })
        );
        return tx;
      }

      return signature.toString("base64");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

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
   * Close the Ledger transport connection and invalidate the public key cache.
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Silently fail on close
      } finally {
        this.transport = null;
        this.publicKeyCache.clear();
      }
    }
  }
}
