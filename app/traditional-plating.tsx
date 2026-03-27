import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, white, midGray } from '../theme/colors';

interface PlatingSection {
  title: string;
  icon: string;
  items: { heading: string; content: string }[];
}

const PLATING: PlatingSection[] = [
  {
    title: 'Regional Thali Arrangements',
    icon: '🗺️',
    items: [
      { heading: 'Maharashtra Thali', content: 'Large steel thali with 6-8 katories. Start with varan-bhaat (dal-rice) in center. Arrange katories clockwise: sabzi, amti, koshimbir, loni (butter), pickle, papad. Place poli/bhakri separately on left. Serve sheera or shrikhand as sweet on the right side.' },
      { heading: 'Gujarati Thali', content: 'Items served simultaneously — dal, kadhi, shaak (vegetable), rice, roti, farsan (snacks). Use a compartmentalized thali if available. Sweet dish (basundi or shiro) placed at top-right. Buttermilk served in a tall glass alongside.' },
      { heading: 'South Indian Banana Leaf', content: 'Banana leaf tip faces left. Pickles and salt go at top-left corner. Rice is placed in center. Sambar on right of rice, rasam below sambar. Kootu (vegetable curry) at top-right. Papad placed across the top. Payasam served last in a small bowl at center-right.' },
      { heading: 'Rajasthani Thali', content: 'Dal-baati-churma as centerpiece. Arrange in order: ker sangri, gatte ki sabzi, bajra roti. Serve laal maas (if non-veg) in a separate deep bowl. Mohan thal or malpua as dessert placed prominently.' },
    ],
  },
  {
    title: 'Plating Individual Dishes',
    icon: '🎨',
    items: [
      { heading: 'Biryani', content: 'Serve in a deep bowl or layered in a copper vessel (deg). Garnish with fried onions, mint leaves and saffron milk drizzled on top. Place lemon wedges and raita in separate small bowls beside it.' },
      { heading: 'Dal', content: 'Pour dal in a katori or small bowl. Add a tempering (tadka) of ghee, cumin, dried red chili and curry leaves on top just before serving — the sizzle adds aroma and visual appeal.' },
      { heading: 'Sabzi (Dry Vegetable)', content: 'Arrange in a medium katori or on one section of the thali. Garnish with fresh coriander (cilantro) chopped fine. For round vegetables like batata (potato), arrange in a small mound, not flat.' },
      { heading: 'Chapati / Roti', content: 'Serve warm, stacked 2-3 at a time in a casserole or covered with a cloth napkin to retain steam. A dab of ghee on top makes it glisten and adds richness.' },
    ],
  },
  {
    title: 'Garnishing Tips',
    icon: '✨',
    items: [
      { heading: 'Fresh Herbs', content: 'Coriander (hara dhania) is the universal garnish. Tear leaves roughly — do not chop too fine or they lose their visual presence. Mint leaves suit raita and drinks. Curry leaves are for South Indian dishes only.' },
      { heading: 'Tempering (Tadka)', content: 'A final tempering of mustard seeds, curry leaves and dried chili in hot ghee brings a dish alive visually and aromatically. Pour sizzling directly on dal, kadhi or rice at the table for theater.' },
      { heading: 'Colour Balance', content: 'A great thali has color variety. Green (sabzi/chutney), orange/red (sabzi/pickle), white (raita/rice), golden-yellow (dal/curry). If all dishes look similar, add a bright chutney or fresh salad.' },
      { heading: 'Edible Flowers & Petals', content: 'For festive occasions, use rose petals, marigold petals or hibiscus to garnish sweets and rice dishes. These are traditional and used in temples — they signal special occasions.' },
    ],
  },
  {
    title: 'Presentation for Guests',
    icon: '🤝',
    items: [
      { heading: 'Warm Always', content: 'Indian food must be served hot. Pre-warm steel thalis by briefly rinsing with hot water. Serve dal and curries from hot pots. Rotis should come directly off the tawa to the plate.' },
      { heading: 'The First Serving', content: 'The first serving to a guest should be generous but not overloaded. Leave room for second helpings — it signals confidence that you will offer more.' },
      { heading: 'Sweets as Welcome', content: 'For festive or special guest visits, start with a small sweet — just one piece of barfi or ladoo — before the main meal. This is a traditional welcome.' },
      { heading: 'Cleanliness', content: 'The thali must be spotless — no old food marks or water stains. Use fresh banana leaves for every serving. Fold the leaf away from yourself after eating (fold toward you signals dissatisfaction with the meal).' },
    ],
  },
];

export default function TraditionalPlatingScreen() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <ScreenWrapper title="Traditional Plating">

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Master the art of presenting Indian food — from the perfect thali to festive garnishes.</Text>
        {PLATING.map((section, si) => (
          <View key={si} style={s.section}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => setExpanded(expanded === si ? null : si)} activeOpacity={0.85}>
              <Text style={s.sectionIcon}>{section.icon}</Text>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.expandIcon}>{expanded === si ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expanded === si && (
              <View style={s.sectionBody}>
                {section.items.map((item, ii) => (
                  <View key={ii} style={s.item}>
                    <Text style={s.itemHeading}>{item.heading}</Text>
                    <Text style={s.itemContent}>{item.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0FDF4' },
  header: { backgroundColor: '#1A6B3C', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  scroll: { padding: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 14, color: '#166534', lineHeight: 22, marginBottom: 20, fontStyle: 'italic' },
  section: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: navy },
  expandIcon: { color: midGray, fontSize: 14 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#DCFCE7' },
  item: { paddingTop: 14 },
  itemHeading: { fontSize: 13, fontWeight: '700', color: '#1A6B3C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  itemContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
