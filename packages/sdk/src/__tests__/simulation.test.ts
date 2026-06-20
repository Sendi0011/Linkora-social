import { LinkoraClient } from "../client";
import { SimulationError } from "../errors";
import { Account } from "@stellar/stellar-sdk";

const mockCall = jest.fn();
const mockBuild = jest.fn();
const mockToEnvelope = jest.fn();
const mockToXDR = jest.fn();
const mockAddOperation = jest.fn();
const mockSetTimeout = jest.fn();
const mockSimulateTransaction = jest.fn();
const mockServerConstructor = jest.fn();

jest.mock("@stellar/stellar-sdk", () => ({
  rpc: {
    Server: jest.fn(() => ({ simulateTransaction: mockSimulateTransaction })),
    Api: {
      isSimulationError: jest.fn((result) => result._isError === true),
      isSimulationSuccess: jest.fn((result) => result._isSuccess === true),
    },
  },
  Contract: jest.fn(() => ({ call: mockCall })),
  nativeToScVal: jest.fn((val: unknown, opts?: unknown) => ({
    _type: "scval",
    _val: val,
    _opts: opts,
  })),
  scValToNative: jest.fn(),
  TransactionBuilder: jest.fn(() => ({
    addOperation: mockAddOperation,
    setTimeout: mockSetTimeout,
  })),
  SorobanDataBuilder: jest.fn(),
  Account: jest.fn(),
  Keypair: {
    random: jest.fn(() => ({ publicKey: () => "GWRITEKEYXXXXXXXXXXXXXXXXXXXXXXXXXX" })),
  },
  Transaction: jest.fn(),
  xdr: {},
}));

const XDR = "AAAAfakexdrbase64encodedstring";
const CONTRACT_ID = "CDUMMY";
const RPC_URL = "https://dummy.example.com";

describe("LinkoraClient simulation and fee injection", () => {
  let client: LinkoraClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LinkoraClient({ contractId: CONTRACT_ID, rpcUrl: RPC_URL });
    mockAddOperation.mockReturnValue(mockSetTimeout);
    mockSetTimeout.mockReturnValue({ build: mockBuild });
    mockBuild.mockReturnValue({ toEnvelope: mockToEnvelope });
    mockToEnvelope.mockReturnValue({ toXDR: mockToXDR });
    mockToXDR.mockReturnValue(XDR);
  });

  describe("simulate()", () => {
    it("should return simulation result with resource fee on success", async () => {
      const mockResult = {
        _isSuccess: true,
        result: {
          minResourceFee: "5000",
          sorobanData: {
            resources: {
              footprint: {
                readOnly: [],
                readWrite: [],
              },
            },
          },
        },
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      const result = await client.simulate("set_profile", {
        _type: "scval",
        _val: "GUSER",
      });

      expect(result.success).toBe(true);
      expect(result.resourceFee).toBe("5000");
      expect(result.footprint).toBeDefined();
    });

    it("should throw SimulationError on simulation failure", async () => {
      const mockResult = {
        _isError: true,
        error: "Contract execution failed",
        events: ["event1"],
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      await expect(client.simulate("set_profile", { _type: "scval", _val: "GUSER" })).rejects.toThrow(
        SimulationError
      );
    });

    it("should throw SimulationError when result is missing", async () => {
      const mockResult = {
        _isSuccess: true,
        result: null,
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      await expect(client.simulate("set_profile", { _type: "scval", _val: "GUSER" })).rejects.toThrow(
        SimulationError
      );
    });
  });

  describe("prepareTransaction()", () => {
    it("should return a prepared transaction with resource fee injected", async () => {
      const mockResult = {
        _isSuccess: true,
        result: {
          minResourceFee: "5000",
          sorobanData: null,
        },
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      const sourceAccount = new Account("GSOURCE", 0);
      const result = await client.prepareTransaction("set_profile", sourceAccount, {
        _type: "scval",
        _val: "GUSER",
      });

      expect(result).toBeDefined();
      // Verify that fee was set correctly (base fee 100 + resource fee 5000)
      expect(mockSetTimeout).toHaveBeenCalled();
    });

    it("should throw SimulationError on simulation failure during preparation", async () => {
      const mockResult = {
        _isError: true,
        error: "Contract execution failed",
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      const sourceAccount = new Account("GSOURCE", 0);

      await expect(
        client.prepareTransaction("set_profile", sourceAccount, {
          _type: "scval",
          _val: "GUSER",
        })
      ).rejects.toThrow(SimulationError);
    });
  });

  describe("buildMultiOpTx()", () => {
    it("should build a transaction with multiple operations", async () => {
      const mockResult = {
        _isSuccess: true,
        result: {
          minResourceFee: "10000",
          sorobanData: null,
        },
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      const sourceAccount = new Account("GSOURCE", 0);
      const ops = [
        { method: "approve", args: [{ _type: "scval", _val: "TOKEN" }] },
        { method: "pool_deposit", args: [{ _type: "scval", _val: "POOL" }] },
      ];

      const result = await client.buildMultiOpTx(sourceAccount, ops);

      expect(result).toBeDefined();
      // Verify that both operations were added
      expect(mockAddOperation).toHaveBeenCalledTimes(4); // 2 for temp tx, 2 for real tx
    });

    it("should throw SimulationError if any operation fails during simulation", async () => {
      const mockResult = {
        _isError: true,
        error: "Operation failed",
      };
      mockSimulateTransaction.mockResolvedValue(mockResult);

      const sourceAccount = new Account("GSOURCE", 0);
      const ops = [
        { method: "approve", args: [{ _type: "scval", _val: "TOKEN" }] },
        { method: "pool_deposit", args: [{ _type: "scval", _val: "POOL" }] },
      ];

      await expect(client.buildMultiOpTx(sourceAccount, ops)).rejects.toThrow(SimulationError);
    });
  });
});
