import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "../theme/useTheme";
import { PostCardSkeleton as SharedPostCardSkeleton } from "./skeletons/PostCardSkeleton";

export interface Post {
  id: number | string;
  author: string;
  username: string;
  content: string;
  tip_total: number;
  timestamp: number;
  like_count: number;
}

interface FeedPostCardProps {
  post: Post;
  onPress?: () => void;
}

interface LegacyPostCardProps {
  id: number | string;
  author: string;
  content: string;
  timestamp: string | number;
  likes?: number;
  isLoading?: boolean;
  onPress?: () => void;
}

type PostCardProps = FeedPostCardProps | LegacyPostCardProps;

function formatTimestamp(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizePost(props: PostCardProps): { post: Post; timeLabel?: string } {
  if ("post" in props) {
    return { post: props.post };
  }

  return {
    post: {
      id: props.id,
      author: props.author,
      username: props.author,
      content: props.content,
      tip_total: 0,
      timestamp: typeof props.timestamp === "number" ? props.timestamp : 0,
      like_count: props.likes ?? 0,
    },
    timeLabel: typeof props.timestamp === "string" ? props.timestamp : undefined,
  };
}

export function PostCard(props: PostCardProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { post, timeLabel } = normalizePost(props);
  const onPress =
    props.onPress ?? (() => router.push(`/post/${post.id}` as Parameters<typeof router.push>[0]));

  const styles = useMemo(() => createStyles(theme), [theme]);

  if ("isLoading" in props && props.isLoading) {
    return <SharedPostCardSkeleton />;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Post by ${post.username}`}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.address}>{shortAddress(post.author)}</Text>
        </View>
        <Text style={styles.time}>{timeLabel ?? formatTimestamp(post.timestamp)}</Text>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <Text style={styles.stat}>♥ {post.like_count}</Text>
        <Text style={styles.stat}>◎ {post.tip_total}</Text>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface.surface1,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 6,
      borderWidth: 1,
      borderColor: theme.colors.surface.border,
    },
    skeleton: {
      opacity: 0.8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.brand.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    avatarText: {
      color: theme.colors.text.onBrand,
      fontWeight: "700",
      fontSize: 16,
    },
    meta: {
      flex: 1,
    },
    username: {
      color: theme.colors.text.primary,
      fontWeight: "600",
      fontSize: 14,
    },
    address: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      fontFamily: "monospace",
    },
    time: {
      color: theme.colors.text.secondary,
      fontSize: 11,
    },
    content: {
      color: theme.colors.text.primary,
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      flexDirection: "row",
      marginTop: 12,
      gap: 16,
    },
    stat: {
      color: theme.colors.text.secondary,
      fontSize: 12,
    },
    skeletonBlock: {
      backgroundColor: theme.colors.surface.surface2,
    },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.surface.surface2,
    },
  });
}
