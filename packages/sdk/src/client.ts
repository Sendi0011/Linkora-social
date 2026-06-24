import {
  rpc,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  Account,
  Keypair,
  xdr,
} from "@stellar/stellar-sdk";
import { Profile, Post, Pool } from "./types";
import { mapError, NotFoundError } from "./errors";

const { isSimulationError, isSimulationSuccess } = rpc.Api;

const DEFAULT_NETWORK = "Test SDF Network ; September 2015";
const DEFAULT_TIMEOUT = 30;

function scvAddress(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "address" });
}

function scvString(value: string): xdr.ScVal {
  return nativeToScVal(value);
}

function scvSymbol(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}

function scvU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

function scvU64(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

function scvI128(value: number | bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

function scvAddressVec(addresses: string[]): xdr.ScVal {
  return nativeToScVal(addresses.map(scvAddress), { type: "vec" });
}

/**
 * Configuration options for the SDK client
 */
export interface ClientConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase?: string;
  /** Contract ID of the token factory contract */
  tokenFactoryId?: string;
}

/**
 * Parameters for deploying a creator token via the factory.
 */
export interface DeployCreatorTokenParams {
  deployer: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
}

/**
 * Parameters for setting a profile with a new token in one flow.
 */
export interface SetProfileWithNewTokenParams {
  user: string;
  username: string;
  tokenParams: Omit<DeployCreatorTokenParams, "deployer">;
}

/**
 * Typed client for all Linkora social contract methods
 */
export class LinkoraClient {
  private contractId: string;
  private rpcUrl: string;
  private networkPassphrase: string;
  private tokenFactoryId: string | null;

  constructor(config: ClientConfig) {
    this.contractId = config.contractId;
    this.rpcUrl = config.rpcUrl;
    this.networkPassphrase = config.networkPassphrase || DEFAULT_NETWORK;
    this.tokenFactoryId = config.tokenFactoryId ?? null;
  }

  private async simulateCall(method: string, ...args: xdr.ScVal[]): Promise<xdr.ScVal | null> {
    const server = new rpc.Server(this.rpcUrl);
    const contract = new Contract(this.contractId);
    const op = contract.call(method, ...args);

    const source = Keypair.random();
    const account = new Account(source.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(DEFAULT_TIMEOUT)
      .build();

    const result = await server.simulateTransaction(tx);

    if (isSimulationError(result)) {
      throw mapError(result.error);
    }
    if (!isSimulationSuccess(result) || !result.result) return null;

    return result.result.retval;
  }

  private buildTx(method: string, ...args: xdr.ScVal[]): string {
    const contract = new Contract(this.contractId);
    const op = contract.call(method, ...args);

    const source = Keypair.random();
    const account = new Account(source.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(DEFAULT_TIMEOUT)
      .build();

    return tx.toEnvelope().toXDR("base64");
  }

  // ── Read Methods ────────────────────────────────────────────────────────────

  async getProfile(address: string): Promise<Profile | null> {
    try {
      const retval = await this.simulateCall("get_profile", scvAddress(address));
      if (!retval) return null;
      const raw = scValToNative(retval);
      if (raw == null) return null;
      return raw as Profile;
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async getProfileCount(): Promise<number> {
    const retval = await this.simulateCall("get_profile_count");
    if (!retval) return 0;
    return Number(scValToNative(retval));
  }

  async getAddressByUsername(username: string): Promise<string | null> {
    const retval = await this.simulateCall("get_address_by_username", scvString(username));
    if (!retval) return null;
    const raw = scValToNative(retval);
    return raw == null ? null : (raw as string);
  }

  async getPost(postId: number): Promise<Post | null> {
    try {
      const retval = await this.simulateCall("get_post", scvU64(postId));
      if (!retval) return null;
      const raw = scValToNative(retval);
      if (raw == null) return null;
      return raw as Post;
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async getPostCount(): Promise<number> {
    const retval = await this.simulateCall("get_post_count");
    if (!retval) return 0;
    return Number(scValToNative(retval));
  }

  async getPostsByAuthor(author: string, offset: number, limit: number): Promise<number[]> {
    const retval = await this.simulateCall(
      "get_posts_by_author",
      scvAddress(author),
      scvU32(offset),
      scvU32(limit)
    );
    if (!retval) return [];
    return (scValToNative(retval) as bigint[]).map(Number);
  }

  async getFollowing(address: string, offset: number, limit: number): Promise<string[]> {
    const retval = await this.simulateCall(
      "get_following",
      scvAddress(address),
      scvU32(offset),
      scvU32(limit)
    );
    if (!retval) return [];
    return scValToNative(retval) as string[];
  }

  async getFollowers(address: string, offset: number, limit: number): Promise<string[]> {
    const retval = await this.simulateCall(
      "get_followers",
      scvAddress(address),
      scvU32(offset),
      scvU32(limit)
    );
    if (!retval) return [];
    return scValToNative(retval) as string[];
  }

  async isBlocked(blocker: string, blocked: string): Promise<boolean> {
    const retval = await this.simulateCall("is_blocked", scvAddress(blocker), scvAddress(blocked));
    if (!retval) return false;
    return scValToNative(retval) as boolean;
  }

  async hasLiked(address: string, postId: number): Promise<boolean> {
    const retval = await this.simulateCall("has_liked", scvAddress(address), scvU64(postId));
    if (!retval) return false;
    return scValToNative(retval) as boolean;
  }

  async getLikeCount(postId: number): Promise<number> {
    const retval = await this.simulateCall("get_like_count", scvU64(postId));
    if (!retval) return 0;
    return Number(scValToNative(retval));
  }

  async getPool(poolId: string): Promise<Pool | null> {
    try {
      const retval = await this.simulateCall("get_pool", scvSymbol(poolId));
      if (!retval) return null;
      const raw = scValToNative(retval);
      if (raw == null) return null;
      return raw as Pool;
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
  }

  async getPoolAdmins(poolId: string): Promise<string[]> {
    const retval = await this.simulateCall("get_pool_admins", scvSymbol(poolId));
    if (!retval) return [];
    return scValToNative(retval) as string[];
  }

  async getFeeBps(): Promise<number> {
    const retval = await this.simulateCall("get_fee_bps");
    if (!retval) return 0;
    return Number(scValToNative(retval));
  }

  async getTreasury(): Promise<string | null> {
    const retval = await this.simulateCall("get_treasury");
    if (!retval) return null;
    const raw = scValToNative(retval);
    return raw == null ? null : (raw as string);
  }

  async getTipCooldownWindow(): Promise<number> {
    const retval = await this.simulateCall("get_tip_cooldown_window");
    if (!retval) return 0;
    return Number(scValToNative(retval));
  }

  /**
   * Get a user's X25519 public key for direct messages.
   * Returns null if the user hasn't published a DM key.
   */
  async getDmKey(address: string): Promise<Uint8Array | null> {
    const result = await this.simulateCall("get_dm_key", scvAddress(address));
    if (!result) return null;
    const native = scValToNative(result);
    return native ? new Uint8Array(native) : null;
  }

  // ── Write Methods (XDR envelope builders) ───────────────────────────────────

  setProfile(user: string, username: string, creatorToken: string): string {
    return this.buildTx(
      "set_profile",
      scvAddress(user),
      scvString(username),
      scvAddress(creatorToken)
    );
  }

  deleteProfile(user: string): string {
    return this.buildTx("delete_profile", scvAddress(user));
  }

  /**
   * Publish a user's X25519 public key for encrypted direct messages.
   */
  publishDmKey(user: string, x25519PubKey: Uint8Array): string {
    if (x25519PubKey.length !== 32) {
      throw new Error("X25519 public key must be exactly 32 bytes");
    }
    return this.buildTx(
      "publish_dm_key",
      scvAddress(user),
      nativeToScVal(Array.from(x25519PubKey), { type: "bytes" })
    );
  }

  createPost(author: string, content: string): string {
    return this.buildTx("create_post", scvAddress(author), scvString(content));
  }

  deletePost(author: string, postId: number): string {
    return this.buildTx("delete_post", scvAddress(author), scvU64(postId));
  }

  follow(follower: string, followee: string): string {
    return this.buildTx("follow", scvAddress(follower), scvAddress(followee));
  }

  unfollow(follower: string, followee: string): string {
    return this.buildTx("unfollow", scvAddress(follower), scvAddress(followee));
  }

  blockUser(blocker: string, blocked: string): string {
    return this.buildTx("block_user", scvAddress(blocker), scvAddress(blocked));
  }

  unblockUser(blocker: string, blocked: string): string {
    return this.buildTx("unblock_user", scvAddress(blocker), scvAddress(blocked));
  }

  likePost(user: string, postId: number): string {
    return this.buildTx("like_post", scvAddress(user), scvU64(postId));
  }

  tip(tipper: string, postId: number, token: string, amount: number | bigint): string {
    return this.buildTx(
      "tip",
      scvAddress(tipper),
      scvU64(postId),
      scvAddress(token),
      scvI128(amount)
    );
  }

  createPool(
    admin: string,
    poolId: string,
    token: string,
    initialAdmins: string[],
    threshold: number
  ): string {
    return this.buildTx(
      "create_pool",
      scvAddress(admin),
      scvSymbol(poolId),
      scvAddress(token),
      scvAddressVec(initialAdmins),
      scvU32(threshold)
    );
  }

  poolDeposit(depositor: string, poolId: string, token: string, amount: number | bigint): string {
    return this.buildTx(
      "pool_deposit",
      scvAddress(depositor),
      scvSymbol(poolId),
      scvAddress(token),
      scvI128(amount)
    );
  }

  poolWithdraw(
    signers: string[],
    poolId: string,
    amount: number | bigint,
    recipient: string
  ): string {
    return this.buildTx(
      "pool_withdraw",
      scvAddressVec(signers),
      scvSymbol(poolId),
      scvI128(amount),
      scvAddress(recipient)
    );
  }

  addPoolAdmin(signers: string[], poolId: string, newAdmin: string): string {
    return this.buildTx(
      "add_pool_admin",
      scvAddressVec(signers),
      scvSymbol(poolId),
      scvAddress(newAdmin)
    );
  }

  removePoolAdmin(signers: string[], poolId: string, admin: string): string {
    return this.buildTx(
      "remove_pool_admin",
      scvAddressVec(signers),
      scvSymbol(poolId),
      scvAddress(admin)
    );
  }

  updatePoolThreshold(signers: string[], poolId: string, threshold: number): string {
    return this.buildTx(
      "update_pool_threshold",
      scvAddressVec(signers),
      scvSymbol(poolId),
      scvU32(threshold)
    );
  }

  setFee(feeBps: number): string {
    return this.buildTx("set_fee", scvU32(feeBps));
  }

  setTreasury(treasury: string): string {
    return this.buildTx("set_treasury", scvAddress(treasury));
  }

  setTipCooldownWindow(cooldownLedgers: number): string {
    return this.buildTx("set_tip_cooldown_window", scvU32(cooldownLedgers));
  }

  // ── Token Factory Methods ────────────────────────────────────────────────────

  /**
   * Build a transaction XDR that calls `deploy_creator_token` on the token
   * factory contract.  The caller must sign this XDR via Freighter and submit
   * it before calling `setProfile` with the returned token address.
   *
   * Requires `tokenFactoryId` to be set in `ClientConfig`.
   */
  deployCreatorToken(params: DeployCreatorTokenParams): string {
    if (!this.tokenFactoryId) {
      throw new Error("tokenFactoryId must be set in ClientConfig to use deployCreatorToken");
    }
    return this.buildTxForContract(
      this.tokenFactoryId,
      "deploy_creator_token",
      scvAddress(params.deployer),
      scvString(params.name),
      scvString(params.symbol),
      scvU32(params.decimals),
      scvI128(params.initialSupply)
    );
  }

  /**
   * Build two sequential transaction XDRs that together:
   * 1. Deploy a creator token via the factory contract.
   * 2. Call `set_profile` on the Linkora contract with the new token address.
   *
   * Returns an ordered array of XDR strings.  The caller must sign and submit
   * them in sequence (e.g. via TransactionQueue) because the token address
   * returned by (1) is needed as input for (2).
   *
   * IMPORTANT: In practice the token address from tx (1) must be extracted
   * from the simulation result before (2) can be built with the real address.
   * Use `simulateDeployCreatorToken` to get the token address first, then call
   * `setProfile` with it.
   *
   * Requires `tokenFactoryId` to be set in `ClientConfig`.
   */
  setProfileWithNewToken(params: SetProfileWithNewTokenParams): [string, string] {
    if (!this.tokenFactoryId) {
      throw new Error("tokenFactoryId must be set in ClientConfig to use setProfileWithNewToken");
    }
    const deployTx = this.deployCreatorToken({
      deployer: params.user,
      ...params.tokenParams,
    });
    // NOTE: the token address used here is a placeholder; callers should
    // first simulate deployCreatorToken to get the real token address, then
    // call setProfile(user, username, tokenAddress) directly.  This method
    // exists for TransactionQueue pre-building and testing the sequencing.
    const profileTx = this.setProfile(params.user, params.username, params.user);
    return [deployTx, profileTx];
  }

  /**
   * Simulate `deploy_creator_token` to determine the token address that would
   * be created.  Does not submit a transaction.
   *
   * Requires `tokenFactoryId` to be set in `ClientConfig`.
   */
  async simulateDeployCreatorToken(params: DeployCreatorTokenParams): Promise<string | null> {
    if (!this.tokenFactoryId) {
      throw new Error(
        "tokenFactoryId must be set in ClientConfig to use simulateDeployCreatorToken"
      );
    }
    const retval = await this.simulateCallOnContract(
      this.tokenFactoryId,
      "deploy_creator_token",
      scvAddress(params.deployer),
      scvString(params.name),
      scvString(params.symbol),
      scvU32(params.decimals),
      scvI128(params.initialSupply)
    );
    if (!retval) return null;
    const native = scValToNative(retval);
    return native == null ? null : (native as string);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildTxForContract(contractId: string, method: string, ...args: xdr.ScVal[]): string {
    const contract = new Contract(contractId);
    const op = contract.call(method, ...args);

    const source = Keypair.random();
    const account = new Account(source.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(DEFAULT_TIMEOUT)
      .build();

    return tx.toEnvelope().toXDR("base64");
  }

  private async simulateCallOnContract(
    contractId: string,
    method: string,
    ...args: xdr.ScVal[]
  ): Promise<xdr.ScVal | null> {
    const server = new rpc.Server(this.rpcUrl);
    const contract = new Contract(contractId);
    const op = contract.call(method, ...args);

    const source = Keypair.random();
    const account = new Account(source.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(DEFAULT_TIMEOUT)
      .build();

    const result = await server.simulateTransaction(tx);

    if (isSimulationError(result)) {
      throw mapError(result.error);
    }
    if (!isSimulationSuccess(result) || !result.result) return null;

    return result.result.retval;
  }
}
