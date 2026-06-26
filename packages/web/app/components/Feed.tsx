"use client";

import { PostCard, Post } from "./PostCard";
import { PostCardSkeleton } from "./PostCardSkeleton";

interface FeedProps {
  posts: Post[];
  loading?: boolean;
  onLike?: (postId: number) => void;
  onTip?: (postId: number) => void;
  likedPosts?: Set<number>;
}

export function Feed({
  posts,
  loading,
  onLike,
  onTip,
  likedPosts = new Set(),
}: FeedProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        {[1, 2, 3].map((i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📝</div>
        <h3>No posts yet</h3>
        <p style={styles.emptyText}>Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={onLike}
          onTip={onTip}
          isLiked={likedPosts.has(post.id)}
        />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "var(--spacing-md)",
  },
  empty: {
    textAlign: "center",
    padding: "var(--spacing-xl)",
    color: "var(--color-text-secondary)",
  },
  emptyIcon: {
    fontSize: "3rem",
    marginBottom: "var(--spacing-md)",
  },
  emptyText: {
    marginTop: "var(--spacing-sm)",
  },
};
