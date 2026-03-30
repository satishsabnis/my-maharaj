import React from 'react';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { navy, white, textSec } from '../theme/colors';

interface DeliveryApp {
  name: string;
  url: string;
  color: string;
  darkText?: boolean;
}

const UAE_APPS: DeliveryApp[] = [
  { name: 'Amazon',        url: 'https://www.amazon.ae',           color: '#FF9900' },
  { name: 'Barakat',       url: 'https://www.barakat.com',         color: '#00A651' },
  { name: 'Careem',        url: 'https://www.careem.com/food/',    color: '#1DBF73' },
  { name: 'Deliveroo',     url: 'https://deliveroo.ae',            color: '#00CCBC' },
  { name: 'elGrocer',      url: 'https://www.elgrocer.com',        color: '#E63946' },
  { name: 'Fresh to Home', url: 'https://www.freshtohome.com',     color: '#FF6B35' },
  { name: 'Instashop',     url: 'https://instashop.io',            color: '#00A651' },
  { name: 'Keeta',         url: 'https://www.keeta.com',           color: '#FF0000' },
  { name: 'Noon',          url: 'https://www.noon.com',            color: '#FFEE00', darkText: true },
  { name: 'Smiles',        url: 'https://www.smilesuae.com',       color: '#FF6600' },
  { name: 'Talabat',       url: 'https://www.talabat.com',         color: '#FF6B00' },
];

const INDIA_APPS: DeliveryApp[] = [
  { name: 'Blinkit', url: 'https://www.blinkit.com',  color: '#0C831F' },
  { name: 'Swiggy',  url: 'https://www.swiggy.com',   color: '#FC8019' },
  { name: 'Zepto',   url: 'https://www.zeptonow.com', color: '#8B5CF6' },
  { name: 'Zomato',  url: 'https://www.zomato.com',   color: '#E23744' },
];

const GENERIC_APPS: DeliveryApp[] = [
  { name: 'DoorDash',  url: 'https://www.doordash.com',  color: '#FF3008' },
  { name: 'Uber Eats', url: 'https://www.ubereats.com',  color: '#06C167' },
];

function getApps(country?: string): DeliveryApp[] {
  const c = (country ?? '').toUpperCase();
  if (c.includes('UAE') || c.includes('EMIRATES') || c.includes('DUBAI')) return UAE_APPS;
  if (c.includes('INDIA') || c === 'IN') return INDIA_APPS;
  return GENERIC_APPS;
}

function openURL(url: string) {
  try { Linking.openURL(url); } catch {
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

  // Split into rows of 3
  const rows: DeliveryApp[][] = [];
  for (let i = 0; i < apps.length; i += 3) {
    rows.push(apps.slice(i, i + 3));
  }

  return (
    <View style={{ marginTop: compact ? 12 : 20 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: navy, marginBottom: 12 }}>
        {title || 'Order ingredients or food online'}
      </Text>

      {/* 3-column grid */}
      <View style={{ gap: 10 }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((app) => (
              <TouchableOpacity
                key={app.name}
                style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
                  padding: 10, borderLeftWidth: 4, borderLeftColor: app.color,
                  borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
                }}
                onPress={() => openURL(app.url)}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: app.color,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: app.darkText ? '#1F2937' : white }}>
                    {app.name.charAt(0)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: navy, textAlign: 'center' }} numberOfLines={1}>{app.name}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: app.color, marginTop: 4 }}>Open</Text>
              </TouchableOpacity>
            ))}
            {/* Fill empty cells in last row */}
            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, fi) => (
              <View key={`fill-${fi}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>

      {/* Banner 1: Integration coming soon */}
      <View style={{
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: 'rgba(201,162,39,0.12)', borderRadius: 12,
        padding: 12, marginTop: 14,
        borderWidth: 1, borderColor: 'rgba(201,162,39,0.3)',
      }}>
        <Text style={{ fontSize: 14 }}>🔗</Text>
        <Text style={{ flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 }}>
          Direct ordering integration coming soon — we are working with these platforms to enable one-tap ordering from your meal plan
        </Text>
      </View>

      {/* Banner 2: Smart shopping */}
      <View style={{
        backgroundColor: navy, borderRadius: 12, padding: 14, marginTop: 10,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: white, lineHeight: 18 }}>
          Coming soon. Maharaj is learning the art of smart shopping. Soon, he will compare prices across prominent stores in your area — finding you the best deals, seasonal offers and bulk savings before you step into the store.
        </Text>
      </View>
    </View>
  );
}
