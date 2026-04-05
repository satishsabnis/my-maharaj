export interface WeatherInfo {
  temp: number;
  description: string;
  icon: string;
  city: string;
}

/**
 * Fetches current weather using Open-Meteo (free, no API key needed).
 * Falls back gracefully on error.
 */
export async function fetchWeather(lat: number, lon: number, city: string): Promise<WeatherInfo | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const temp = Math.round(data?.current?.temperature_2m ?? 0);
    const code = data?.current?.weather_code ?? 0;
    const { description, icon } = weatherCodeToInfo(code);
    return { temp, description, icon, city };
  } catch {
    return null;
  }
}

/**
 * Tries browser geolocation, returns coords or Dubai default.
 */
export async function getCoords(): Promise<{ lat: number; lon: number; city: string }> {
  const DEFAULT = { lat: 25.2048, lon: 55.2708, city: 'Dubai' };
  if (typeof navigator === 'undefined' || !navigator.geolocation) return DEFAULT;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
    });
    // Reverse geocode for city name
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`
    );
    const geo = await res.json();
    const city = geo?.address?.city || geo?.address?.town || geo?.address?.state || 'your area';
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, city };
  } catch {
    return DEFAULT;
  }
}

/**
 * Returns a weather-aware meal suggestion prompt, or null if weather is unremarkable.
 */
export function getWeatherMealPrompt(info: WeatherInfo): { message: string; mealContext: string; icon: string } | null {
  const { temp, description } = info;
  const isRain = description.toLowerCase().includes('rain') || description.toLowerCase().includes('drizzle') || description.toLowerCase().includes('thunderstorm');
  const isCold = temp < 22;
  const isHot = temp > 38;

  if (isRain) return {
    message: `It's going to rain today \u2601\uFE0F \u2014 want Maharaj to suggest something warm for dinner?`,
    mealContext: `Today's weather: ${description}, ${temp}\u00B0C. Adjust this meal to be warm and comforting \u2014 soups, hot curries, pakoras, chai.`,
    icon: '\u2601\uFE0F',
  };
  if (isCold) return {
    message: `Cool day at ${temp}\u00B0C \u2744\uFE0F \u2014 shall Maharaj plan something warm and hearty?`,
    mealContext: `Today's weather: ${description}, ${temp}\u00B0C. Adjust this meal to be warm and hearty \u2014 thick dals, hot rotis, warm drinks.`,
    icon: '\u2744\uFE0F',
  };
  if (isHot) return {
    message: `Scorching ${temp}\u00B0C today \uD83C\uDF21\uFE0F \u2014 shall we make lunch lighter and cooling?`,
    mealContext: `Today's weather: ${description}, ${temp}\u00B0C. Adjust this meal to be light and cooling \u2014 curd rice, raita, nimbu pani, salads.`,
    icon: '\uD83C\uDF21\uFE0F',
  };

  // Unremarkable weather — no card
  return null;
}

function weatherCodeToInfo(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Clear sky', icon: '\u2600\uFE0F' };
  if (code <= 3) return { description: 'Partly cloudy', icon: '\u26C5' };
  if (code <= 49) return { description: 'Foggy', icon: '\uD83C\uDF2B\uFE0F' };
  if (code <= 59) return { description: 'Drizzle', icon: '\uD83C\uDF26\uFE0F' };
  if (code <= 69) return { description: 'Rain', icon: '\uD83C\uDF27\uFE0F' };
  if (code <= 79) return { description: 'Snow', icon: '\uD83C\uDF28\uFE0F' };
  if (code <= 84) return { description: 'Rain showers', icon: '\uD83C\uDF27\uFE0F' };
  if (code <= 86) return { description: 'Snow showers', icon: '\u2744\uFE0F' };
  if (code >= 95) return { description: 'Thunderstorm', icon: '\u26C8\uFE0F' };
  return { description: 'Overcast', icon: '\u2601\uFE0F' };
}
