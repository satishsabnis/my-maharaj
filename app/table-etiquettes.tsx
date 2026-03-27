import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, gold, white, midGray } from '../theme/colors';

interface EtiquetteSection {
  title: string;
  icon: string;
  items: { heading: string; content: string }[];
}

const ETIQUETTES: EtiquetteSection[] = [
  {
    title: 'Setting a Traditional Thali',
    icon: '🍽️',
    items: [
      { heading: 'Plate Position', content: 'The thali (round plate) is placed at the center. Small katories (bowls) are arranged in a semicircle at the top — dal, sabzi, raita from left to right.' },
      { heading: 'Rice & Roti', content: 'Rice is placed on the right side of the plate; rotis or puri are on the left or brought separately in a basket.' },
      { heading: 'Pickles & Papad', content: 'Achaar (pickle) goes to the far left katori. Papad is placed to the right of rotis. Sweets are served last or in a separate katori at top-right.' },
      { heading: 'Water Placement', content: 'Water glass or lota is placed to the upper right of the thali, within easy reach without reaching across.' },
    ],
  },
  {
    title: 'Guest Serving Customs',
    icon: '🤝',
    items: [
      { heading: 'Atithi Devo Bhava', content: 'The guest is God — always serve guests first before family members eat. Keep refilling without being asked.' },
      { heading: 'Insisting on More', content: 'It is tradition to insist guests eat more ("thoda aur lo!"). Guests often decline twice before accepting — this is normal hospitality.' },
      { heading: 'Using Right Hand', content: 'Food is always served and received with the right hand. Using the left hand to give or take food is considered disrespectful.' },
      { heading: 'Elders First', content: 'In a family setting, serve elders first. The eldest person often begins eating to signal the meal has started.' },
    ],
  },
  {
    title: 'Eating Customs',
    icon: '🙏',
    items: [
      { heading: 'Before Eating', content: 'Many families say a brief prayer or gratitude before eating. Wash hands thoroughly before and after the meal.' },
      { heading: 'Eating with Hands', content: 'Eating with fingers (right hand only) is traditional and considered more connected to the food. Mix rice and dal with fingers — it is not considered rude.' },
      { heading: 'Finishing the Plate', content: 'Wasting food is frowned upon. It is respectful to finish what is served. If you cannot eat more, politely decline before the host serves.' },
      { heading: 'Leaving the Table', content: 'Traditionally, one should not leave the table while others are still eating. Wait until elders finish or excuse yourself politely.' },
    ],
  },
  {
    title: 'Festival Meal Customs',
    icon: '🪔',
    items: [
      { heading: 'Diwali', content: 'Sweets (mithai) are exchanged and served first as an offering. Fasting foods (sabudana, fruits) are served on Dhanteras. Full feast on Diwali day.' },
      { heading: 'Ganesh Chaturthi', content: 'Modak (sweet dumpling) is offered first to Ganesh idol before serving guests. No non-vegetarian food on the first day.' },
      { heading: 'Navratri', content: 'Strict fasting rules: no non-veg, no onion, no garlic. Sabudana khichdi, kuttu (buckwheat) and rajgira dishes are traditional.' },
      { heading: 'Holi', content: 'Thandai (spiced milk drink) and gujiya (sweet dumplings) are traditional. Food is shared freely with neighbours and guests.' },
      { heading: 'Eid', content: 'Seviyan (sweet vermicelli) is served first after prayers. Guests are welcomed with biryani and sheer khurma as signs of celebration.' },
    ],
  },
  {
    title: 'Regional Dining Differences',
    icon: '🗺️',
    items: [
      { heading: 'South India', content: 'Meals are served on banana leaves. Food is eaten sitting cross-legged on the floor (traditionally). Rice is the center; items arranged around it.' },
      { heading: 'Maharashtra', content: 'Thali service is elaborate for guests. Amti (dal), bhaaji, bhakri/poli, kosimbir (salad) and sheera (sweet) are typical components.' },
      { heading: 'North India', content: 'Chapati and dal are staples. Guests are expected to have at least three rotis. Refusing food is politely deflected by the host.' },
      { heading: 'Gujarat', content: 'Food is primarily sweet-leaning. Rotis, dal, rice, vegetables, buttermilk (chaas) and a dessert are served simultaneously on the thali.' },
    ],
  },
];

export default function TableEtiquettesScreen() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <ScreenWrapper title="Table Etiquettes">

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>Learn the art of Indian dining — from setting a thali to honoring your guests.</Text>
        {ETIQUETTES.map((section, si) => (
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
  safe: { flex: 1, backgroundColor: '#FBF8F2' },
  header: { backgroundColor: '#C9A227', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 14, paddingBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: white },
  scroll: { padding: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 14, color: '#5C4B1E', lineHeight: 22, marginBottom: 20, fontStyle: 'italic' },
  section: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: navy },
  expandIcon: { color: midGray, fontSize: 14 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F3EDD8' },
  item: { paddingTop: 14 },
  itemHeading: { fontSize: 13, fontWeight: '700', color: '#C9A227', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  itemContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
