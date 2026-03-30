import { Platform } from 'react-native';
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

// Common grocery stores by country
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

export async function detectLocation(): Promise<UserLocation> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const { latitude, longitude } = pos.coords;

      // Reverse geocode using free API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'MyMaharajApp/1.0' } }
      );
      const data = await res.json();
      const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.state || 'Unknown';
      const country = data?.address?.country || 'Unknown';
      const stores = getStores(country);
      return { city, country, stores };
    }
  } catch {
    // Geolocation denied or failed — fall back to saved profile or default
  }
  return DEFAULT_LOCATION;
}

export async function loadOrDetectLocation(): Promise<UserLocation> {
  try {
    const user = await getSessionUser();
    if (!user) return DEFAULT_LOCATION;

    // Detect location (user_city/user_country columns may not exist yet)
    const loc = await detectLocation();
    return loc;
  } catch {
    return DEFAULT_LOCATION;
  }
}
