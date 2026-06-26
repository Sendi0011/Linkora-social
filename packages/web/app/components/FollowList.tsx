"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { LinkoraClient } from "linkora-sdk";
import { OptimisticStore } from "../lib/optimisticStore";

export interface FollowUser {
  address: string;
  username: string;
}

interface FollowListProps {
  address: string;
  type: "followers" | "following";
}

const PAGE_SIZE = 15;

function getBlockieSvg(address: string) {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c1 = (hash & 0x00ffffff).toString(16).padStart(6, "0");
  const c2 = ((hash >> 8) & 0x00ffffff).toString(16).padStart(6, "0");
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="40" height="40"><rect width="8" height="8" fill="%23${c1}"/><rect x="1" y="1" width="6" height="6" fill="%23${c2}" opacity="0.6"/><rect x="2" y="2" width="4" height="4" fill="%23${c1}" opacity="0.8"/></svg>`;
}

function formatAddress(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function FollowList({ address, type }: FollowListProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // States from OptimisticStore to trigger updates
  const [, setTick] = useState(0);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  // Initialize client and active user
  const client = useRef<LinkoraClient | null>(null);
  useEffect(() => {
    client.current = new LinkoraClient({
      contractId: process.env.NEXT_PUBLIC_CONTRACT_ID || "CBQHLSNMBF4HS3UX2PV72T75V2SXE7M2EZZTQ6YC5DSXIGGY4NPSAFAF",
      rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
    });

    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("linkora_wallet_public_key");
      setCurrentUser(storedUser);

      const storedBlocked = localStorage.getItem("linkora_blocked_accounts");
      if (storedBlocked) {
        try {
          setBlockedList(JSON.parse(storedBlocked));
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // Subscribe to optimistic store updates
    const unsubscribe = OptimisticStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const load = useCallback(
    async (offset: number, replace: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/follows/${address}/${type}?limit=${PAGE_SIZE}&offset=${offset}`);
        if (!res.ok) {
          throw new Error("Failed to load list");
        }
        const data = await res.json();
        const listField = type === "followers" ? data.followers : data.following;
        
        setUsers((prev) => (replace ? listField : [...prev, ...listField]));
        setHasMore(data.has_more ?? (listField.length >= PAGE_SIZE));
        offsetRef.current = offset + listField.length;
      } catch (err) {
        setError("Failed to load users. Please try again later.");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [address, type]
  );

  useEffect(() => {
    offsetRef.current = 0;
    load(0, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      load(offsetRef.current, false);
    }
  }, [loading, hasMore, load]);

  // Infinite scroll trigger
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.8 }
    );
    const target = document.getElementById("infinite-scroll-trigger");
    if (target) observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  const handleToggleFollow = async (targetUser: FollowUser) => {
    if (!currentUser) {
      alert("Please connect your wallet to follow users.");
      return;
    }

    const targetAddress = targetUser.address;
    const isFollowing = OptimisticStore.isFollowing(targetAddress);

    // Apply optimistic update immediately
    OptimisticStore.setFollowing(targetAddress, !isFollowing);
    OptimisticStore.setPending(targetAddress, true);

    try {
      // Simulate/trigger contract call via SDK client
      const isMockAddress = targetAddress.includes("XXXX") || currentUser.includes("XXXX");
      if (client.current && !isMockAddress) {
        if (isFollowing) {
          client.current.unfollow(currentUser, targetAddress);
        } else {
          client.current.follow(currentUser, targetAddress);
        }
      }
      
      // Simulate blockchain tx delay
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      // Revert optimistic update on failure
      OptimisticStore.setFollowing(targetAddress, isFollowing);
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      OptimisticStore.setPending(targetAddress, false);
    }
  };

  // Filter list by client-side searchQuery and hide blocked accounts
  const visibleUsers = users.filter((u) => {
    const isBlocked = blockedList.includes(u.address);
    if (isBlocked) return false;

    if (searchQuery) {
      return u.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href={`/profile/${address}`} style={styles.backLink}>
          &larr; Back to Profile
        </Link>
        <h1 style={styles.title}>
          {type === "followers" ? "Followers" : "Following"}
        </h1>
      </header>

      <div style={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Filter by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
          aria-label="Filter users by username"
        />
      </div>

      {error && (
        <div style={styles.emptyState} role="alert">
          <p style={styles.emptyText}>{error}</p>
        </div>
      )}

      {visibleUsers.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No accounts found.</p>
        </div>
      )}

      <ul role="list" aria-label={type === "followers" ? "Followers list" : "Following list"} style={styles.list}>
        {visibleUsers.map((user) => {
          const isFollowing = OptimisticStore.isFollowing(user.address);
          const isPending = OptimisticStore.isPending(user.address);
          const isMe = currentUser?.toLowerCase() === user.address.toLowerCase();

          return (
            <li
              key={user.address}
              role="listitem"
              tabIndex={0}
              style={styles.listItem}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  // keyboard navigation to user profile
                  window.location.href = `/profile/${user.address}`;
                }
              }}
            >
              <div style={styles.userRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getBlockieSvg(user.address)}
                  alt={`${user.username}'s avatar`}
                  style={styles.avatar}
                />
                <div style={styles.meta}>
                  <Link href={`/profile/${user.address}`} style={styles.username}>
                    @{user.username}
                  </Link>
                  <span style={styles.address}>{formatAddress(user.address)}</span>
                </div>

                {!isMe && currentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFollow(user);
                    }}
                    disabled={isPending}
                    style={{
                      ...styles.followBtn,
                      ...(isFollowing ? styles.followingBtn : {}),
                      ...(isPending ? styles.pendingBtn : {}),
                    }}
                    aria-label={isFollowing ? `Unfollow ${user.username}` : `Follow ${user.username}`}
                  >
                    {isPending ? "Updating..." : isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {loading && (
        <div style={styles.loadingWrapper} aria-live="polite">
          <span style={styles.spinner} />
          <p style={styles.loadingText}>Loading users...</p>
        </div>
      )}

      {hasMore && !loading && (
        <div id="infinite-scroll-trigger" style={styles.scrollTrigger} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "var(--spacing-lg)",
    minHeight: "100vh",
    background: "var(--color-bg-secondary)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--spacing-sm)",
    marginBottom: "var(--spacing-lg)",
  },
  backLink: {
    fontSize: "0.9rem",
    color: "var(--color-primary)",
    textDecoration: "none",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "var(--color-text)",
    margin: 0,
  },
  searchWrapper: {
    marginBottom: "var(--spacing-md)",
  },
  searchInput: {
    width: "100%",
    padding: "var(--spacing-md)",
    border: "1px solid var(--color-border)",
    borderRadius: "10px",
    fontSize: "1rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    boxSizing: "border-box",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "var(--spacing-sm)",
  },
  listItem: {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    padding: "var(--spacing-md)",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-md)",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "1px solid var(--color-border)",
  },
  meta: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  username: {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "var(--color-text)",
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  address: {
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    fontFamily: "monospace",
  },
  followBtn: {
    padding: "6px 16px",
    background: "var(--color-primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    minHeight: "36px",
    minWidth: "90px",
    transition: "all 0.15s",
  },
  followingBtn: {
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  },
  pendingBtn: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyState: {
    textAlign: "center",
    padding: "var(--spacing-xl)",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
  },
  emptyText: {
    color: "var(--color-text-secondary)",
    fontSize: "0.95rem",
    margin: 0,
  },
  loadingWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--spacing-sm)",
    padding: "var(--spacing-lg)",
  },
  loadingText: {
    color: "var(--color-text-secondary)",
    fontSize: "0.9rem",
    margin: 0,
  },
  spinner: {
    display: "inline-block",
    width: "20px",
    height: "20px",
    border: "2px solid var(--color-border)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  scrollTrigger: {
    height: "1px",
    margin: "10px 0",
  },
};
