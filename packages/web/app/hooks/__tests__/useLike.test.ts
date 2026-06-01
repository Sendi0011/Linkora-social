import { renderHook, act } from "@testing-library/react";
import { useLike } from "../useLike";

/**
 * Unit tests for the useLike hook.
 * Covers initial state derived from has_liked, optimistic increment,
 * idempotency once liked, and the disconnected-wallet guard.
 */

const mockWallet = {
  publicKey: "GBRPYHIL2CI3WHZDTOOQFC6EB4RBIGSJRVSBUOYS77TQ7CQK5FHQ6SR" as string | null,
  isConnected: true,
  isConnecting: false,
  error: null as string | null,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock("../../components/WalletProvider", () => ({
  useWallet: () => mockWallet,
}));

describe("useLike", () => {
  beforeEach(() => {
    mockWallet.publicKey = "GBRPYHIL2CI3WHZDTOOQFC6EB4RBIGSJRVSBUOYS77TQ7CQK5FHQ6SR";
    jest.clearAllMocks();
  });

  it("derives initial state from has_liked", () => {
    const { result } = renderHook(() =>
      useLike({ postId: 1, initialHasLiked: true, initialLikeCount: 5 })
    );

    expect(result.current.liked).toBe(true);
    expect(result.current.likeCount).toBe(5);
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("increments the count immediately on click (optimistic)", async () => {
    const { result } = renderHook(() =>
      useLike({ postId: 1, initialHasLiked: false, initialLikeCount: 5 })
    );

    let pending: Promise<boolean>;
    act(() => {
      pending = result.current.like();
    });

    // Optimistic update is applied synchronously, before the round-trip resolves.
    expect(result.current.liked).toBe(true);
    expect(result.current.likeCount).toBe(6);
    expect(result.current.pending).toBe(true);

    await act(async () => {
      await pending;
    });

    expect(result.current.pending).toBe(false);
    expect(result.current.liked).toBe(true);
    expect(result.current.likeCount).toBe(6);
  });

  it("is idempotent once liked", async () => {
    const { result } = renderHook(() =>
      useLike({ postId: 1, initialHasLiked: false, initialLikeCount: 5 })
    );

    await act(async () => {
      await result.current.like();
    });
    expect(result.current.likeCount).toBe(6);

    let second: boolean | undefined;
    await act(async () => {
      second = await result.current.like();
    });

    expect(second).toBe(false);
    expect(result.current.likeCount).toBe(6);
  });

  it("does not like when the wallet is disconnected", async () => {
    mockWallet.publicKey = null;
    const { result } = renderHook(() =>
      useLike({ postId: 1, initialHasLiked: false, initialLikeCount: 5 })
    );

    let committed: boolean | undefined;
    await act(async () => {
      committed = await result.current.like();
    });

    expect(committed).toBe(false);
    expect(result.current.liked).toBe(false);
    expect(result.current.likeCount).toBe(5);
    expect(result.current.error).toMatch(/wallet/i);
  });
});
