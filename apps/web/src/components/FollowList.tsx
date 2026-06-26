"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { LinkoraClient } from "linkora-sdk";
import { OptimisticStore } from "@/lib/OptimisticStore";


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

  const [, setTick] = useState(0);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const client = useRef<LinkoraClient | null>(null);

  useEffect(() => {
    client.current = new LinkoraClient({
      contractId:
        process.env.NEXT_PUBLIC_CONTRACT_ID ||
        "CBQHLSNMBF4HS3UX2PV72T75V2SXE7M2EZZTQ6YC5DSXIGGY4NPSAFAF",
      rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
    });

    if (typeof window !== "undefined") {
      const storedUser =
        localStorage.getItem("linkora_wallet_address") ||
        localStorage.getItem("linkora_wallet_public_key");
      setCurrentUser(storedUser);

      const storedBlocked = localStorage.getItem("linkora_blocked_accounts");
      if (storedBlocked) {
        try {
          setBlockedList(JSON.parse(storedBlocked));
        } catch {}
      }
    }

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
        const res = await fetch(
          `/api/follows/${address}/${type}?limit=${PAGE_SIZE}&offset=${offset}`
        );
        if (!res.ok) {
          throw new Error("Failed to load list");
        }
        const data = await res.json();
        const listField = type === "followers" ? data.followers : data.following;

        setUsers((prev) => (replace ? listField : [...prev, ...listField]));
        setHasMore(data.has_more ?? listField.length >= PAGE_SIZE);
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

    OptimisticStore.setFollowing(targetAddress, !isFollowing);
    OptimisticStore.setPending(targetAddress, { isPending: true });

    try {
      const isMockAddress = targetAddress.includes("XXXX") || currentUser.includes("XXXX");
      if (client.current && !isMockAddress) {
        if (isFollowing) {
          client.current.unfollow(currentUser, targetAddress);
        } else {
          client.current.follow(currentUser, targetAddress);
        }
      }
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      OptimisticStore.setFollowing(targetAddress, isFollowing);
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      OptimisticStore.setPending(targetAddress, { isPending: false });
    }
  };

  const visibleUsers = users.filter((u) => {
    const isBlocked = blockedList.includes(u.address);
    if (isBlocked) return false;

    if (searchQuery) {
      return u.username.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <header className="flex flex-col gap-2 mb-6">
        <Link
          href={`/profile/${address}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold mb-2 inline-block self-start"
        >
          &larr; Back to Profile
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {type === "followers" ? "Followers" : "Following"}
        </h1>
      </header>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 shadow-sm"
          aria-label="Filter users by username"
        />
      </div>

      {visibleUsers.length === 0 && !loading && (
        <div className="text-center p-8 bg-gray-50 border border-gray-200 rounded-2xl">
          <p className="text-gray-500">No accounts found.</p>
        </div>
      )}

      <ul
        role="list"
        aria-label={type === "followers" ? "Followers list" : "Following list"}
        className="flex flex-col gap-3"
      >
        {visibleUsers.map((user) => {
          const isFollowing = OptimisticStore.isFollowing(user.address);
          const isPending = OptimisticStore.isPending(user.address);
          const isMe = currentUser?.toLowerCase() === user.address.toLowerCase();

          return (
            <li
              key={user.address}
              role="listitem"
              tabIndex={0}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  window.location.href = `/profile/${user.address}`;
                }
              }}
            >
              <div className="flex items-center gap-3 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getBlockieSvg(user.address)}
                  alt={`${user.username}'s avatar`}
                  className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${user.address}`}
                    className="block font-semibold text-gray-900 hover:text-indigo-600 truncate"
                  >
                    @{user.username}
                  </Link>
                  <span className="block text-xs text-gray-500 font-mono truncate">
                    {formatAddress(user.address)}
                  </span>
                </div>

                {!isMe && currentUser && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFollow(user);
                    }}
                    disabled={isPending}
                    className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition-all flex-shrink-0 min-w-[100px] h-[36px] flex items-center justify-center ${
                      isFollowing
                        ? "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-250"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    } ${isPending ? "opacity-55 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label={
                      isFollowing ? `Unfollow ${user.username}` : `Follow ${user.username}`
                    }
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
        <div className="flex items-center justify-center gap-2 p-6" aria-live="polite">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      )}

      {hasMore && !loading && <div id="infinite-scroll-trigger" className="h-1 my-2" />}
    </div>
  );
}
