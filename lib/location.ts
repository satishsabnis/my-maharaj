import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSessionUser } from './supabase';

export interface UserLocation {
  city: string;
  country: string;
  stores: string;
}

const DEFAULT_LOCATION: UserLocation = {
  city: 'Dubai',
  country: 'UAE',
  stores: 'Carrefour/Spinneys/Lulu',
};

const STORES_BY_COUNTRY: Record<string, string> = {
  'UAE': 'Carrefour/Spinneys/Lulu',
  'United Arab Emirates': 'Carrefour/Spinneys/Lulu',
  'India': 'BigBasket/DMart/Reliance Fresh',
  'US': 'Walmart/Whole Foods/Trader Joe\'s',
  'United States': 'Walmart/Whole Foods/Trader Joe\'s',
  'UK': 'Tesco/Sainsbury\'s/Asda',
  'United Kingdom': 'Tesco/Sainsbury\'s/Asda',
  'Canada': 'Loblaws/Walmart/No Frills',
  'Australia': 'Woolworths/Coles/Aldi',
  'Singapore': 'FairPrice/Cold Storage/Giant',
  'Saudi Arabia': 'Danube/Tamimi/Carrefour',
  'Qatar': 'Lulu/Carrefour/Al Meera',
  'Kuwait': 'The Sultan Center/Carrefour/Lulu',
  'Bahrain': 'Lulu/Carrefour/Al Jazira',
  'Oman': 'Lulu/Carrefour/Al Fair',
};

function getStores(country: string): string {
  return STORES_BY_COUNTRY[country] ?? 'local grocery stores';
}

const CACHE_KEY = 'cached_location';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function getCachedLocation(): Promise<UserLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { loc, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return loc as UserLocation;
  } catch {}
  return null;
}

async function setCachedLocation(loc: UserLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ loc, ts: Date.now() }));
  } catch {}
}

export async function detectLocation(): Promise<UserLocation> {
  // Check cache first — avoids repeated geolocation prompts
  const cached = await getCachedLocation();
  if (cached) return cached;

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const { latitude, longitude } = pos.coords;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
      );
      const data = await res.json();
      const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || 'Unknown';
      const country = data?.address?.country || 'Unknown';
      const stores = getStores(country);
      const loc = { city, country, stores };
      await setCachedLocation(loc);
      return loc;
    }
  } catch {
    // Geolocation denied or failed — fall back to default
  }
  await setCachedLocation(DEFAULT_LOCATION);
  return DEFAULT_LOCATION;
}

export async function loadOrDetectLocation(): Promise<UserLocation> {
  // Check cache first
  const cached = await getCachedLocation();
  if (cached) return cached;

  try {
    const loc = await detectLocation();
    return loc;
  } catch {
    return DEFAULT_LOCATION;
  }
}
