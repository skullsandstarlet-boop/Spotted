import * as Location from 'expo-location';

import type { Coordinates } from '@/types/spotted';

export const FALLBACK_COORDINATES: Coordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export async function getCurrentCoordinates(): Promise<{ coords: Coordinates; approximate: boolean }> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { coords: FALLBACK_COORDINATES, approximate: true };
  }

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 300000, requiredAccuracy: 500 });
  const position = lastKnown ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
    approximate: false,
  };
}
