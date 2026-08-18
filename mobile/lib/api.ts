import type { Coordinates, SpotPost, SpotPostCreate, SpotPostListResponse } from '@/types/spotted';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error('Something went wrong. Please try again.');
  }

  return response.json() as Promise<T>;
}

export function getNearbySpots(coords: Coordinates, radiusM: number): Promise<SpotPostListResponse> {
  const params = new URLSearchParams({
    lat: String(coords.latitude),
    lng: String(coords.longitude),
    radius_m: String(radiusM),
  });
  return apiFetch<SpotPostListResponse>(`/spots/nearby?${params.toString()}`);
}

export function createSpot(payload: SpotPostCreate): Promise<SpotPost> {
  return apiFetch<SpotPost>('/spots', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
