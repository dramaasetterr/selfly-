import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, shadows, spacing, borderRadius, typography } from '../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Listing {
  id: string;
  user_id: string;
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

interface SellerProfile {
  full_name: string;
  phone: string | null;
}

type PropertyFilter = 'All' | 'House' | 'Condo' | 'Townhouse';
type PriceFilter = 'Any' | 'Under 300k' | '300k-500k' | '500k-750k' | '750k+';
type SortOption = 'Newest' | 'Price: Low' | 'Price: High' | 'Sqft';

const PROPERTY_FILTERS: PropertyFilter[] = ['All', 'House', 'Condo', 'Townhouse'];
const PRICE_FILTERS: PriceFilter[] = ['Any', 'Under 300k', '300k-500k', '500k-750k', '750k+'];
const SORT_OPTIONS: SortOption[] = ['Newest', 'Price: Low', 'Price: High', 'Sqft'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const { user } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('All');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('Any');
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);
      if (data) {
        setSavedIds(new Set(data.map((f: any) => f.listing_id)));
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchListings();
    fetchFavorites();
  }, [fetchListings, fetchFavorites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
    fetchFavorites();
  }, [fetchListings, fetchFavorites]);

  const toggleSave = async (listingId: string) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save listings.');
      return;
    }
    const isSaved = savedIds.has(listingId);
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(listingId);
      else next.add(listingId);
      return next;
    });

    if (isSaved) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId });
    }
  };

  const callSeller = async (listing: Listing) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', listing.user_id)
        .single();
      const profile = data as SellerProfile | null;
      if (profile?.phone) {
        Linking.openURL(`tel:${profile.phone}`);
      } else {
        Alert.alert(
          'No Phone Number',
          'This seller hasn\'t added a phone number. You can message them instead.',
          [
            { text: 'Message Seller', onPress: () => navigation.navigate('ContactSeller', { listingId: listing.id }) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Could not fetch seller info. Please try again.');
    }
  };

  // Filtered & sorted listings
  const filtered = listings
    .filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.address?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (propertyFilter !== 'All') {
        const typeMap: Record<string, string> = {
          'House': 'single_family',
          'Condo': 'condo',
          'Townhouse': 'townhouse',
        };
        if (l.property_type !== typeMap[propertyFilter]) return false;
      }
      if (!matchesPriceFilter(l.price, priceFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'Price: Low': return (a.price || 0) - (b.price || 0);
        case 'Price: High': return (b.price || 0) - (a.price || 0);
        case 'Sqft': return (b.sqft || 0) - (a.sqft || 0);
        default: return 0; // Newest is default from DB
      }
    });

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderListingCard = ({ item }: { item: Listing }) => {
    const isSaved = savedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.listingCard}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
      >
        {/* Photo */}
        <View style={styles.photoContainer}>
          {item.photos && item.photos.length > 0 ? (
            <Image source={{ uri: item.photos[0] }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <View style={styles.gradientPlaceholder}>
              <Text style={styles.gradientPlaceholderText}>{"\uD83C\uDFE0"}</Text>
            </View>
          )}
          {/* Save heart */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => toggleSave(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.heartIcon}>{isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          {/* Photo count */}
          {item.photos && item.photos.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>📷 {item.photos.length}</Text>
            </View>
          )}
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.property_type || 'Home'}</Text>
          </View>
        </View>

        {/* Card body */}
        <View style={styles.cardBody}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.price?.toLocaleString()}</Text>
          </View>
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

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callButton}
              activeOpacity={0.8}
              onPress={() => callSeller(item)}
            >
              <Text style={styles.callButtonText}>📞 Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ContactSeller', { listingId: item.id })}
            >
              <Text style={styles.messageButtonText}>✉️ Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.detailsButton}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
            >
              <Text style={styles.detailsButtonText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.title}>Chiavi Marketplace</Text>
        <Text style={styles.subtitle}>
          {filtered.length} {filtered.length === 1 ? 'home' : 'homes'} available
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by city or address..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters {showFilters ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Property type pills */}
          <Text style={styles.filterLabel}>Property Type</Text>
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
          <Text style={styles.filterLabel}>Price Range</Text>
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

          {/* Sort options */}
          <Text style={styles.filterLabel}>Sort By</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {SORT_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterPill, sortOption === s && styles.filterPillActive]}
                onPress={() => setSortOption(s)}
              >
                <Text
                  style={[styles.filterPillText, sortOption === s && styles.filterPillTextActive]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active filter tags */}
      {(propertyFilter !== 'All' || priceFilter !== 'Any' || sortOption !== 'Newest') && (
        <View style={styles.activeFiltersRow}>
          {propertyFilter !== 'All' && (
            <TouchableOpacity style={styles.activeTag} onPress={() => setPropertyFilter('All')}>
              <Text style={styles.activeTagText}>{propertyFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {priceFilter !== 'Any' && (
            <TouchableOpacity style={styles.activeTag} onPress={() => setPriceFilter('Any')}>
              <Text style={styles.activeTagText}>{priceFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {sortOption !== 'Newest' && (
            <TouchableOpacity style={styles.activeTag} onPress={() => setSortOption('Newest')}>
              <Text style={styles.activeTagText}>{sortOption} ✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setPropertyFilter('All'); setPriceFilter('Any'); setSortOption('Newest'); }}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listings */}
      {fetchError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Something Went Wrong</Text>
          <Text style={styles.emptyBody}>
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.8}
            onPress={() => { setLoading(true); fetchListings(); }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
    paddingBottom: spacing.sm,
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
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggle: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
  },
  filterToggleText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  filterToggleTextActive: {
    color: colors.white,
  },

  // Filters
  filtersContainer: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  filterLabel: {
    ...typography.smallBold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
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

  // Active filters
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  activeTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  activeTagText: {
    ...typography.small,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  clearAllText: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.xs,
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
    height: 200,
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

  // Heart / save button
  heartButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  heartIcon: {
    fontSize: 18,
  },

  // Photo count
  photoCountBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  photoCountText: {
    ...typography.small,
    color: colors.white,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callButton: {
    flex: 1,
    backgroundColor: colors.successLight || '#E8F5E9',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success || '#4CAF50',
  },
  callButtonText: {
    ...typography.captionBold,
    color: colors.success || '#2E7D32',
  },
  messageButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  messageButtonText: {
    ...typography.captionBold,
    color: colors.primaryLight,
  },
  detailsButton: {
    flex: 0.7,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    ...typography.captionBold,
    color: colors.white,
  },

  // Retry button
  retryButton: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  retryButtonText: {
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
