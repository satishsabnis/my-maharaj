import React from 'react';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { navy, white, textSec } from '../theme/colors';

interface DeliveryApp {
  name: string;
  tagline: string;
  color: string;
  url: string;
}

const UAE_APPS: DeliveryApp[] = [
  { name: 'Instashop', tagline: 'Grocery delivery in 1 hour', color: '#00A651', url: 'https://instashop.io' },
  { name: 'Deliveroo', tagline: 'Food and grocery delivery', color: '#00CCBC', url: 'https://deliveroo.ae' },
  { name: 'Smiles', tagline: 'Deals and food delivery', color: '#FF6600', url: 'https://www.smilesuae.com' },
  { name: 'elGrocer', tagline: 'Online supermarket delivery', color: '#E63946', url: 'https://www.elgrocer.com' },
];

const INDIA_APPS: DeliveryApp[] = [
  { name: 'Zomato', tagline: 'Food delivery & dining out', color: '#E23744', url: 'https://www.zomato.com' },
  { name: 'Swiggy', tagline: 'Food & grocery delivery', color: '#FC8019', url: 'https://www.swiggy.com' },
  { name: 'Blinkit', tagline: 'Groceries in 10 minutes', color: '#0C831F', url: 'https://www.blinkit.com' },
  { name: 'Zepto', tagline: 'Instant grocery delivery', color: '#8B5CF6', url: 'https://www.zeptonow.com' },
];

const GENERIC_APPS: DeliveryApp[] = [
  { name: 'Uber Eats', tagline: 'Food delivery from local spots', color: '#06C167', url: 'https://www.ubereats.com' },
  { name: 'DoorDash', tagline: 'Delivery & takeout nearby', color: '#FF3008', url: 'https://www.doordash.com' },
];

function getApps(country?: string): DeliveryApp[] {
  const c = (country ?? '').toUpperCase();
  if (c.includes('UAE') || c.includes('EMIRATES')) return UAE_APPS;
  if (c.includes('INDIA') || c === 'IN') return INDIA_APPS;
  return GENERIC_APPS;
}

function openURL(url: string) {
  try {
    Linking.openURL(url);
  } catch {
    if (Platform.OS === 'web') window.open(url, '_blank');
  }
}

interface Props {
  country?: string;
  title?: string;
  compact?: boolean;
}

export default function DeliveryAppsSection({ country, title, compact }: Props) {
  const apps = getApps(country);
  const regionName = (country ?? '').toUpperCase().includes('UAE') ? 'UAE'
    : (country ?? '').toUpperCase().includes('INDIA') || (country ?? '').toUpperCase() === 'IN' ? 'India'
    : 'your area';

  return (
    <View style={{ marginTop: compact ? 12 : 20 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 }}>
        {title || 'Order ingredients or food online'}
      </Text>

      <View style={{ gap: 10 }}>
        {apps.map((app) => (
          <TouchableOpacity
            key={app.name}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
              padding: compact ? 12 : 16,
              borderLeftWidth: 4, borderLeftColor: app.color,
              borderWidth: 1, borderColor: '#E5E7EB',
            }}
            onPress={() => openURL(app.url)}
            activeOpacity={0.8}
          >
            <View style={{
              width: 42, height: 42, borderRadius: 10,
              backgroundColor: app.color + '18',
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: app.color }}>
                {app.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: navy }}>{app.name}</Text>
              <Text style={{ fontSize: 11, color: textSec, marginTop: 1 }}>{app.tagline}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: app.color }}>Open App →</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Integration coming soon banner */}
      <View style={{
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 12,
        padding: 12, marginTop: 14,
        borderWidth: 1, borderColor: 'rgba(201,162,39,0.3)',
      }}>
        <Text style={{ fontSize: 16 }}>🔗</Text>
        <Text style={{ flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 }}>
          Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan
        </Text>
      </View>
    </View>
  );
}
