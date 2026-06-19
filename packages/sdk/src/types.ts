/**
 * Types representing the data structures returned by the smart contracts
 */

export interface Profile {
  address: string;
  username: string;
  creator_token: string;
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

/** Analytics attestation returned by the oracle service API. */
export interface AnalyticsAttestation {
  oracleName: string;
  reportHash: string;
  reportCbor: string;
  signature: string;
  submittedAt: number;
  report: {
    version: number;
    creator: string;
    windowStart: string;
    windowEnd: string;
    totalTips: string;
    postCount: string;
    followerDelta: string;
    uniqueTippers: number;
  };
}
