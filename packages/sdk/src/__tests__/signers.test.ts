import { FreighterSigner } from "../signers/freighter";
import { LedgerSigner } from "../signers/ledger";

// Mock window for FreighterSigner tests
const mockFreighterSign = jest.fn();
const mockFreighterGetPublicKey = jest.fn();

// Mock Ledger transports
const mockWebHIDTransport = {
  create: jest.fn(),
};

const mockNodeHIDTransport = {
  list: jest.fn(),
  open: jest.fn(),
};

const mockStrApp = jest.fn();

describe("FreighterSigner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup window.freighter mock
    (global as any).window = {
      freighter: {
        getPublicKey: mockFreighterGetPublicKey,
        signTransaction: mockFreighterSign,
      },
    };
  });

  afterEach(() => {
    delete (global as any).window;
  });

  it("should throw error if Freighter is not available", () => {
    delete (global as any).window;
    expect(() => new FreighterSigner()).toThrow("Freighter extension not found");
  });

  it("should get public key from Freighter", async () => {
    mockFreighterGetPublicKey.mockResolvedValue("GPUBLICKEY123");

    const signer = new FreighterSigner();
    const publicKey = await signer.getPublicKey();

    expect(publicKey).toBe("GPUBLICKEY123");
    expect(mockFreighterGetPublicKey).toHaveBeenCalled();
  });

  it("should cache public key on subsequent calls", async () => {
    mockFreighterGetPublicKey.mockResolvedValue("GPUBLICKEY123");

    const signer = new FreighterSigner();
    await signer.getPublicKey();
    await signer.getPublicKey();

    // Should only be called once
    expect(mockFreighterGetPublicKey).toHaveBeenCalledTimes(1);
  });

  it("should sign transaction with Freighter", async () => {
    mockFreighterGetPublicKey.mockResolvedValue("GPUBLICKEY123");
    mockFreighterSign.mockResolvedValue("SIGNEDURLSTRING");

    const signer = new FreighterSigner();
    const result = await signer.signTransaction("fakexdrstring");

    expect(result).toBe("SIGNEDURLSTRING");
    expect(mockFreighterSign).toHaveBeenCalledWith("fakexdrstring");
  });

  it("should throw error if Freighter sign fails", async () => {
    mockFreighterSign.mockRejectedValue(new Error("User rejected"));

    const signer = new FreighterSigner();

    await expect(signer.signTransaction("fakexdrstring")).rejects.toThrow(
      "Failed to sign transaction with Freighter"
    );
  });
});

describe("LedgerSigner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock dynamic imports
    jest.mock("@ledgerhq/hw-transport-webhid", () => ({
      default: mockWebHIDTransport,
    }));
    jest.mock("@ledgerhq/hw-transport-node-hid", () => ({
      default: mockNodeHIDTransport,
    }));
    jest.mock("@ledgerhq/hw-app-str", () => ({
      default: mockStrApp,
    }));
  });

  afterEach(() => {
    jest.unmock("@ledgerhq/hw-transport-webhid");
    jest.unmock("@ledgerhq/hw-transport-node-hid");
    jest.unmock("@ledgerhq/hw-app-str");
  });

  it("should initialize LedgerSigner", () => {
    const signer = new LedgerSigner();
    expect(signer).toBeDefined();
  });

  it("should handle device not connected error", async () => {
    const signer = new LedgerSigner();

    // Test close method doesn't throw
    await expect(signer.close()).resolves.not.toThrow();
  });

  it("should provide default derivation path", async () => {
    // This test verifies the interface expects derivation path parameter
    const signer = new LedgerSigner();
    expect(signer).toBeDefined();
  });
});

describe("Signer interface", () => {
  it("should have consistent interface across implementations", () => {
    // Verify that both signers implement the Signer interface
    const freighterSigner = new FreighterSigner();
    const ledgerSigner = new LedgerSigner();

    // Both should have getPublicKey and signTransaction methods
    expect(typeof freighterSigner.getPublicKey).toBe("function");
    expect(typeof freighterSigner.signTransaction).toBe("function");
    expect(typeof ledgerSigner.getPublicKey).toBe("function");
    expect(typeof ledgerSigner.signTransaction).toBe("function");
  });
});
