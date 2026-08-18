export type SpotCategory = 'general' | 'pets' | 'free' | 'food' | 'traffic' | 'safety' | 'events';

export interface SpotPost {
  id: number;
  body: string;
  category: SpotCategory;
  latitude: number;
  longitude: number;
  location_hint: string | null;
  created_at: string;
  expires_at: string;
  distance_m: number | null;
}

export interface SpotPostCreate {
  body: string;
  category: SpotCategory;
  latitude: number;
  longitude: number;
  location_hint?: string | null;
  duration_hours: number;
}

export interface SpotPostListResponse {
  posts: SpotPost[];
  radius_m: number;
  count: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
