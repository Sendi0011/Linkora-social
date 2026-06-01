import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "../../theme/useTheme";

const INITIAL_BLOCKED = [
  {
    address: "GCFM4HKN3K2HMQY3X7T62JAT4B73W5C5V2F3KJDJQJY5M7WQ4H7W3ABC",
    reason: "Spam replies",
  },
  {
    address: "GBQ4BJEK4ABWQ5NEM7N5W3M7X4T2R6N3ZJYQ3FQW6N5K4JH6D2J7CDEF",
    reason: "Harassment",
  },
];

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [blocked, setBlocked] = useState(INITIAL_BLOCKED);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Safety</Text>
      <Text style={styles.title}>Blocked users</Text>
      <Text style={styles.subtitle}>
        Review accounts you have blocked and remove them if you want to see their activity again.
      </Text>

      {blocked.length > 0 ? (
        blocked.map((user) => (
          <View key={user.address} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.meta}>
                <Text style={styles.address}>{shortAddress(user.address)}</Text>
                <Text style={styles.reason}>{user.reason}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${user.address}`}
                onPress={() => setBlocked((current) => current.filter((item) => item.address !== user.address))}
                style={styles.unblockButton}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyText}>You have not blocked any accounts yet.</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to settings"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>Back to settings</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface.background,
    },
    content: {
      padding: 24,
      gap: 16,
    },
    eyebrow: {
      color: theme.colors.brand.secondary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 28,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.surface.border,
      backgroundColor: theme.colors.surface.surface1,
      padding: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    meta: {
      flex: 1,
      gap: 4,
    },
    address: {
      color: theme.colors.text.primary,
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "monospace",
    },
    reason: {
      color: theme.colors.text.secondary,
      fontSize: 13,
    },
    unblockButton: {
      backgroundColor: theme.colors.semantic.errorLight,
      borderRadius: 9999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    unblockText: {
      color: theme.colors.semantic.error,
      fontSize: 12,
      fontWeight: "700",
    },
    empty: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.surface.border,
      backgroundColor: theme.colors.surface.surface1,
      padding: 20,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: "700",
    },
    emptyText: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      textAlign: "center",
    },
    backButton: {
      marginTop: 8,
      paddingVertical: 12,
      alignItems: "center",
    },
    backText: {
      color: theme.colors.brand.primary,
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
