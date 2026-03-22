import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../App";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { colors, shadows, spacing, borderRadius, typography } from "../theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  listing_id: string;
  listing_address: string;
  other_party_id: string;
  other_party_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch messages involving the current user, grouped by listing + other party
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, listing_id, sender_id, receiver_id, content, created_at, read, listing:listings(address)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      if (!messages || messages.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Group by listing_id + other party
      const convMap = new Map<string, Conversation>();

      for (const msg of messages as any[]) {
        const otherPartyId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.listing_id}::${otherPartyId}`;

        if (!convMap.has(key)) {
          const listingAddress =
            msg.listing?.address || "Unknown Address";

          convMap.set(key, {
            id: key,
            listing_id: msg.listing_id,
            listing_address: listingAddress,
            other_party_id: otherPartyId,
            other_party_name: "", // Will be resolved below
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }

        const conv = convMap.get(key)!;
        if (msg.receiver_id === user.id && !msg.read) {
          conv.unread_count += 1;
        }
      }

      // Resolve other party names
      const otherPartyIds = [...new Set([...convMap.values()].map((c) => c.other_party_id))];
      if (otherPartyIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", otherPartyIds);

        const nameMap = new Map<string, string>();
        if (profiles) {
          for (const p of profiles) {
            nameMap.set(p.id, p.full_name || "Unknown");
          }
        }

        for (const conv of convMap.values()) {
          conv.other_party_name = nameMap.get(conv.other_party_id) || "Unknown";
        }
      }

      const sorted = [...convMap.values()].sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setConversations(sorted);
    } catch (err) {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setFetchError(false);
      fetchConversations();
    }, [fetchConversations])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("Conversation", {
          listingId: item.listing_id,
          otherPartyId: item.other_party_id,
          otherPartyName: item.other_party_name,
        })
      }
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {item.other_party_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.conversationBody}>
        <View style={styles.conversationTopRow}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.other_party_name}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTimestamp(item.last_message_at)}
          </Text>
        </View>
        <Text style={styles.conversationListing} numberOfLines={1}>
          {item.listing_address}
        </Text>
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {truncate(item.last_message, 80)}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {item.unread_count > 99 ? "99+" : item.unread_count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>{"\u2190"} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : fetchError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>
            Could not load messages. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setFetchError(false);
              fetchConversations();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>{"\uD83D\uDCAC"}</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            When you contact a seller or receive a message, it will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
          }
        >
          {conversations.map((item) => (
            <View key={item.id}>
              {renderConversation({ item })}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  backButton: {
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  headerSpacer: {
    minWidth: 60,
  },

  // Empty state
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },

  // List
  listContent: {
    paddingVertical: spacing.sm,
  },

  // Conversation card
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: colors.primaryLight,
  },
  conversationBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  conversationName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationTime: {
    ...typography.small,
    color: colors.textMuted,
  },
  conversationListing: {
    ...typography.small,
    color: colors.primaryLight,
    marginBottom: 2,
  },
  conversationPreview: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Unread badge
  unreadBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs + 2,
  },
  unreadText: {
    ...typography.smallBold,
    color: colors.white,
  },
});
