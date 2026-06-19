import {
  rpc,
  Contract,
  nativeToScVal,
  TransactionBuilder,
  Keypair,
  xdr,
} from "@stellar/stellar-sdk";

const DEFAULT_TIMEOUT = 30;

/**
 * Submits a `verify_analytics_attestation` call to the contract.
 *
 * The oracle pays its own gas using the keypair derived from the oracle private key.
 */
export async function submitAttestation(
  rpcUrl: string,
  networkPassphrase: string,
  contractId: string,
  oracleName: string,
  reportCbor: Buffer,
  signature: Buffer,
  oracleKeypair: Keypair
): Promise<string> {
  const server = new rpc.Server(rpcUrl);

  const oracleNameVal = nativeToScVal(oracleName, { type: "symbol" });
  const reportCborVal = nativeToScVal(reportCbor, { type: "bytes" });
  const signatureVal = xdr.ScVal.scvBytes(signature);

  const contract = new Contract(contractId);
  const op = contract.call(
    "verify_analytics_attestation",
    oracleNameVal,
    reportCborVal,
    signatureVal
  );

  const sourceAccount = await server.getAccount(oracleKeypair.publicKey());
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "1000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(DEFAULT_TIMEOUT)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(oracleKeypair);
  const result = await server.sendTransaction(prepared);
  return result.hash;
}
