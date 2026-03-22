import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../App';
import { supabase } from '../lib/supabase';
import { colors, shadows, spacing, borderRadius, typography } from '../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  property_type: string;
  photos: string[];
  status: string;
}

type PropertyFilter = 'All' | 'House' | 'Condo' | 'Townhouse';
type PriceFilter = 'Any' | 'Under 300k' | '300k-500k' | '500k-750k' | '750k+';

const PROPERTY_FILTERS: PropertyFilter[] = ['All', 'House', 'Condo', 'Townhouse'];
const PRICE_FILTERS: PriceFilter[] = ['Any', 'Under 300k', '300k-500k', '500k-750k', '750k+'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `$${(price / 1_000_000).toFixed(2)}M`;
  }
  return `$${(price / 1_000).toFixed(0)}k`;
}

function matchesPriceFilter(price: number, filter: PriceFilter): boolean {
  switch (filter) {
    case 'Any':
      return true;
    case 'Under 300k':
      return price < 300_000;
    case '300k-500k':
      return price >= 300_000 && price < 500_000;
    case '500k-750k':
      return price >= 500_000 && price < 750_000;
    case '750k+':
      return price >= 750_000;
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MarketplaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('All');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('Any');

  const fetchListings = useCallback(async () => {
    try {
      setFetchError(false);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(true);
      } else {
        setListings((data as Listing[]) || []);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  // Filtered listings
  const filtered = listings.filter((l) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        l.address?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q);
      if (!match) return false;
    }
    // Property type
    if (propertyFilter !== 'All') {
      const typeMap: Record<string, string> = {
        'House': 'single_family',
        'Condo': 'condo',
        'Townhouse': 'townhouse',
      };
      if (l.property_type !== typeMap[propertyFilter]) return false;
    }
    // Price
    if (!matchesPriceFilter(l.price, priceFilter)) return false;
    return true;
  });

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderListingCard = ({ item }: { item: Listing }) => (
    <View style={styles.listingCard}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {item.photos && item.photos.length > 0 ? (
          <Image source={{ uri: item.photos[0] }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={styles.gradientPlaceholder}>
            <Text style={styles.gradientPlaceholderText}>{"\uD83C\uDFE0"}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{item.property_type || 'Home'}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <Text style={styles.price}>${item.price?.toLocaleString()}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {item.address}
        </Text>
        {(item.city || item.state) ? (
          <Text style={styles.cityState} numberOfLines={1}>
            {[item.city, item.state].filter(Boolean).join(', ')}
          </Text>
        ) : null}

        {/* Stats badges */}
        <View style={styles.statsRow}>
          {item.bedrooms != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{item.bedrooms} bd</Text>
            </View>
          )}
          {item.bathrooms != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{item.bathrooms} ba</Text>
            </View>
          )}
          {item.sqft != null && (
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{item.sqft.toLocaleString()} sqft</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Selfly Marketplace</Text>
        <Text style={styles.subtitle}>Find your next home — no agent needed</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by city or address..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Property type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {PROPERTY_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, propertyFilter === f && styles.filterPillActive]}
            onPress={() => setPropertyFilter(f)}
          >
            <Text
              style={[styles.filterPillText, propertyFilter === f && styles.filterPillTextActive]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Price range pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {PRICE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, priceFilter === f && styles.filterPillActive]}
            onPress={() => setPriceFilter(f)}
          >
            <Text
              style={[styles.filterPillText, priceFilter === f && styles.filterPillTextActive]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      {fetchError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Something Went Wrong</Text>
          <Text style={styles.emptyBody}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.viewButton}
            activeOpacity={0.8}
            onPress={() => { setLoading(true); fetchListings(); }}
          >
            <Text style={styles.viewButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏘️</Text>
          <Text style={styles.emptyTitle}>No Listings Found</Text>
          <Text style={styles.emptyBody}>
            {listings.length === 0
              ? 'There are no active listings right now. Check back soon!'
              : 'No listings match your filters. Try adjusting your search.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
          }
        >
          {filtered.map((item) => (
            <View key={item.id}>
              {renderListingCard({ item })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: colors.primaryLight,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Filters
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.white,
    fontWeight: '600',
  },

  // Listing cards
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  photoContainer: {
    height: 180,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  gradientPlaceholder: {
    flex: 1,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientPlaceholderText: {
    fontSize: 48,
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    ...typography.smallBold,
    color: colors.white,
  },
  cardBody: {
    padding: spacing.md,
  },
  price: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  address: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  cityState: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statText: {
    ...typography.smallBold,
    color: colors.primaryLight,
  },
  viewButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  viewButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
