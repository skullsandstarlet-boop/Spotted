import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { getNearbySpots } from '@/lib/api';
import { getCurrentCoordinates } from '@/lib/location';
import type { Coordinates, SpotCategory, SpotPost } from '@/types/spotted';
import { Text } from '@/components/ui/Text';

const RADIUS_OPTIONS = [1000, 3000, 5000, 10000];

const CATEGORY_META: Record<SpotCategory, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  general: { label: 'General', color: '#7C2D12', bg: '#FFEDD5', icon: 'eye' },
  pets: { label: 'Pets', color: '#166534', bg: '#DCFCE7', icon: 'paw' },
  free: { label: 'Free', color: '#6D28D9', bg: '#EDE9FE', icon: 'gift' },
  food: { label: 'Food', color: '#B45309', bg: '#FEF3C7', icon: 'fast-food' },
  traffic: { label: 'Traffic', color: '#1D4ED8', bg: '#DBEAFE', icon: 'car' },
  safety: { label: 'Safety', color: '#BE123C', bg: '#FFE4E6', icon: 'shield-checkmark' },
  events: { label: 'Events', color: '#047857', bg: '#D1FAE5', icon: 'calendar' },
};

function formatDistance(distanceM: number | null): string {
  if (distanceM === null) return 'nearby';
  if (distanceM < 1000) return `${distanceM} m away`;
  return `${(distanceM / 1000).toFixed(1)} km away`;
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'ending now';
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.ceil(minutes / 60)}h left`;
}

function radiusLabel(radiusM: number): string {
  return radiusM < 1000 ? `${radiusM} m` : `${radiusM / 1000} km`;
}

function SpotCard({ spot }: { spot: SpotPost }) {
  const meta = CATEGORY_META[spot.category] ?? CATEGORY_META.general;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryPill, { backgroundColor: meta.bg }]}> 
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text style={[styles.categoryText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.expiresText}>{formatTimeLeft(spot.expires_at)}</Text>
      </View>

      <Text style={styles.spotBody}>{spot.body}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="navigate" size={15} color="#8A7A68" />
          <Text style={styles.footerText}>{formatDistance(spot.distance_m)}</Text>
        </View>
        {spot.location_hint ? (
          <View style={styles.footerItem}>
            <Ionicons name="location" size={15} color="#8A7A68" />
            <Text style={styles.footerText}>{spot.location_hint}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function NearbyScreen() {
  const [spots, setSpots] = useState<SpotPost[]>([]);
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [radiusM, setRadiusM] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approximateLocation, setApproximateLocation] = useState(false);

  const loadSpots = useCallback(async (nextRadius = radiusM, refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const location = await getCurrentCoordinates();
      setCoords(location.coords);
      setApproximateLocation(location.approximate);
      const response = await getNearbySpots(location.coords, nextRadius);
      setSpots(response.posts);
    } catch {
      setError('Spots could not be loaded right now. Pull to try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [radiusM]);

  useFocusEffect(
    useCallback(() => {
      void loadSpots(radiusM);
    }, [loadSpots, radiusM])
  );

  const subtitle = useMemo(() => {
    if (approximateLocation) return 'Showing seeded activity until location access is enabled';
    if (!coords) return 'Finding live sightings around you';
    return 'Anonymous posts near your current location';
  }, [approximateLocation, coords]);

  const changeRadius = (nextRadius: number) => {
    setRadiusM(nextRadius);
    void loadSpots(nextRadius);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSpots(radiusM, true)} tintColor="#F97316" />}
    >
      <View style={styles.hero}>
        <View style={styles.logoBubble}>
          <Ionicons name="eye" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.kicker}>Spotted</Text>
        <Text style={styles.title}>What is happening nearby?</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((option) => {
          const selected = option === radiusM;
          return (
            <Pressable
              key={option}
              onPress={() => changeRadius(option)}
              style={[styles.radiusChip, selected && styles.radiusChipSelected]}
            >
              <Text style={[styles.radiusText, selected && styles.radiusTextSelected]}>{radiusLabel(option)}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color="#F97316" />
          <Text style={styles.stateText}>Listening for fresh spots...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle" size={24} color="#BE123C" />
          <Text style={styles.stateText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && spots.length === 0 ? (
        <View style={styles.stateCard}>
          <Ionicons name="moon" size={24} color="#8A7A68" />
          <Text style={styles.stateText}>It is quiet nearby. Be the first to spot something useful.</Text>
        </View>
      ) : null}

      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Live nearby</Text>
        <Text style={styles.feedCount}>{spots.length} active</Text>
      </View>

      <View style={styles.feedList}>
        {spots.map((spot) => (
          <SpotCard key={spot.id} spot={spot} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8EF',
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  hero: {
    backgroundColor: '#1F1308',
    borderRadius: 32,
    padding: 24,
    gap: 10,
    overflow: 'hidden',
  },
  logoBubble: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kicker: {
    color: '#FDBA74',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: '#F7D9BC',
    fontSize: 15,
    lineHeight: 22,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  radiusChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2E7D8',
  },
  radiusChipSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  radiusText: {
    color: '#6B5B4A',
    fontWeight: '800',
  },
  radiusTextSelected: {
    color: '#FFFFFF',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2E7D8',
  },
  stateText: {
    color: '#6B5B4A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTitle: {
    color: '#1F1308',
    fontSize: 22,
    fontWeight: '900',
  },
  feedCount: {
    color: '#8A7A68',
    fontWeight: '800',
  },
  feedList: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F2E7D8',
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '900',
  },
  expiresText: {
    color: '#F97316',
    fontWeight: '900',
    fontSize: 13,
  },
  spotBody: {
    color: '#25170C',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '800',
  },
  cardFooter: {
    gap: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  footerText: {
    color: '#8A7A68',
    fontSize: 14,
    fontWeight: '700',
  },
});
