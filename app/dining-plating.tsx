import React, { useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { navy, gold, white, textSec, midGray } from '../theme/colors';

// ─── Table Etiquettes Data ───────────────────────────────────────────────────

const ETIQUETTES = [
  {
    title: 'Setting a Traditional Thali', icon: '',
    items: [
      { heading: 'Plate Position', content: 'The thali (round plate) is placed at the center. Small katories (bowls) are arranged in a semicircle at the top — dal, sabzi, raita from left to right.' },
      { heading: 'Rice & Roti', content: 'Rice is placed on the right side of the plate; rotis or puri are on the left or brought separately in a basket.' },
      { heading: 'Pickles & Papad', content: 'Achaar (pickle) goes to the far left katori. Papad is placed to the right of rotis. Sweets are served last or in a separate katori at top-right.' },
      { heading: 'Water Placement', content: 'Water glass or lota is placed to the upper right of the thali, within easy reach without reaching across.' },
    ],
  },
  {
    title: 'Guest Serving Customs', icon: '',
    items: [
      { heading: 'Atithi Devo Bhava', content: 'The guest is God — always serve guests first before family members eat. Keep refilling without being asked.' },
      { heading: 'Insisting on More', content: 'It is tradition to insist guests eat more ("thoda aur lo!"). Guests often decline twice before accepting — this is normal hospitality.' },
      { heading: 'Using Right Hand', content: 'Food is always served and received with the right hand. Using the left hand to give or take food is considered disrespectful.' },
      { heading: 'Elders First', content: 'In a family setting, serve elders first. The eldest person often begins eating to signal the meal has started.' },
    ],
  },
  {
    title: 'Eating Customs', icon: '',
    items: [
      { heading: 'Before Eating', content: 'Many families say a brief prayer or gratitude before eating. Wash hands thoroughly before and after the meal.' },
      { heading: 'Eating with Hands', content: 'Eating with fingers (right hand only) is traditional and considered more connected to the food. Mix rice and dal with fingers — it is not considered rude.' },
      { heading: 'Finishing the Plate', content: 'Wasting food is frowned upon. It is respectful to finish what is served. If you cannot eat more, politely decline before the host serves.' },
      { heading: 'Leaving the Table', content: 'Traditionally, one should not leave the table while others are still eating. Wait until elders finish or excuse yourself politely.' },
    ],
  },
  {
    title: 'Festival Meal Customs', icon: '',
    items: [
      { heading: 'Diwali', content: 'Sweets (mithai) are exchanged and served first as an offering. Fasting foods (sabudana, fruits) are served on Dhanteras. Full feast on Diwali day.' },
      { heading: 'Ganesh Chaturthi', content: 'Modak (sweet dumpling) is offered first to Ganesh idol before serving guests. No non-vegetarian food on the first day.' },
      { heading: 'Navratri', content: 'Strict fasting rules: no non-veg, no onion, no garlic. Sabudana khichdi, kuttu (buckwheat) and rajgira dishes are traditional.' },
      { heading: 'Holi', content: 'Thandai (spiced milk drink) and gujiya (sweet dumplings) are traditional. Food is shared freely with neighbours and guests.' },
      { heading: 'Eid', content: 'Seviyan (sweet vermicelli) is served first after prayers. Guests are welcomed with biryani and sheer khurma as signs of celebration.' },
    ],
  },
  {
    title: 'Regional Dining Differences', icon: '',
    items: [
      { heading: 'South India', content: 'Meals are served on banana leaves. Food is eaten sitting cross-legged on the floor (traditionally). Rice is the center; items arranged around it.' },
      { heading: 'Maharashtra', content: 'Thali service is elaborate for guests. Amti (dal), bhaaji, bhakri/poli, kosimbir (salad) and sheera (sweet) are typical components.' },
      { heading: 'North India', content: 'Chapati and dal are staples. Guests are expected to have at least three rotis. Refusing food is politely deflected by the host.' },
      { heading: 'Gujarat', content: 'Food is primarily sweet-leaning. Rotis, dal, rice, vegetables, buttermilk (chaas) and a dessert are served simultaneously on the thali.' },
    ],
  },
];

// ─── Traditional Plating Data ────────────────────────────────────────────────

const PLATING = [
  {
    title: 'Regional Thali Arrangements', icon: '',
    items: [
      { heading: 'Maharashtra Thali', content: 'Large steel thali with 6-8 katories. Start with varan-bhaat (dal-rice) in center. Arrange katories clockwise: sabzi, amti, koshimbir, loni (butter), pickle, papad. Place poli/bhakri separately on left. Serve sheera or shrikhand as sweet on the right side.' },
      { heading: 'Gujarati Thali', content: 'Items served simultaneously — dal, kadhi, shaak (vegetable), rice, roti, farsan (snacks). Use a compartmentalized thali if available. Sweet dish (basundi or shiro) placed at top-right. Buttermilk served in a tall glass alongside.' },
      { heading: 'South Indian Banana Leaf', content: 'Banana leaf tip faces left. Pickles and salt go at top-left corner. Rice is placed in center. Sambar on right of rice, rasam below sambar. Kootu (vegetable curry) at top-right. Papad placed across the top. Payasam served last in a small bowl at center-right.' },
      { heading: 'Rajasthani Thali', content: 'Dal-baati-churma as centerpiece. Arrange in order: ker sangri, gatte ki sabzi, bajra roti. Serve laal maas (if non-veg) in a separate deep bowl. Mohan thal or malpua as dessert placed prominently.' },
    ],
  },
  {
    title: 'Plating Individual Dishes', icon: '',
    items: [
      { heading: 'Biryani', content: 'Serve in a deep bowl or layered in a copper vessel (deg). Garnish with fried onions, mint leaves and saffron milk drizzled on top. Place lemon wedges and raita in separate small bowls beside it.' },
      { heading: 'Dal', content: 'Pour dal in a katori or small bowl. Add a tempering (tadka) of ghee, cumin, dried red chili and curry leaves on top just before serving — the sizzle adds aroma and visual appeal.' },
      { heading: 'Sabzi (Dry Vegetable)', content: 'Arrange in a medium katori or on one section of the thali. Garnish with fresh coriander (cilantro) chopped fine. For round vegetables like batata (potato), arrange in a small mound, not flat.' },
      { heading: 'Chapati / Roti', content: 'Serve warm, stacked 2-3 at a time in a casserole or covered with a cloth napkin to retain steam. A dab of ghee on top makes it glisten and adds richness.' },
    ],
  },
  {
    title: 'Garnishing Tips', icon: '',
    items: [
      { heading: 'Fresh Herbs', content: 'Coriander (hara dhania) is the universal garnish. Tear leaves roughly — do not chop too fine or they lose their visual presence. Mint leaves suit raita and drinks. Curry leaves are for South Indian dishes only.' },
      { heading: 'Tempering (Tadka)', content: 'A final tempering of mustard seeds, curry leaves and dried chili in hot ghee brings a dish alive visually and aromatically. Pour sizzling directly on dal, kadhi or rice at the table for theater.' },
      { heading: 'Colour Balance', content: 'A great thali has color variety. Green (sabzi/chutney), orange/red (sabzi/pickle), white (raita/rice), golden-yellow (dal/curry). If all dishes look similar, add a bright chutney or fresh salad.' },
      { heading: 'Edible Flowers & Petals', content: 'For festive occasions, use rose petals, marigold petals or hibiscus to garnish sweets and rice dishes. These are traditional and used in temples — they signal special occasions.' },
    ],
  },
  {
    title: 'Presentation for Guests', icon: '',
    items: [
      { heading: 'Warm Always', content: 'Indian food must be served hot. Pre-warm steel thalis by briefly rinsing with hot water. Serve dal and curries from hot pots. Rotis should come directly off the tawa to the plate.' },
      { heading: 'The First Serving', content: 'The first serving to a guest should be generous but not overloaded. Leave room for second helpings — it signals confidence that you will offer more.' },
      { heading: 'Sweets as Welcome', content: 'For festive or special guest visits, start with a small sweet — just one piece of barfi or ladoo — before the main meal. This is a traditional welcome.' },
      { heading: 'Cleanliness', content: 'The thali must be spotless — no old food marks or water stains. Use fresh banana leaves for every serving. Fold the leaf away from yourself after eating (fold toward you signals dissatisfaction with the meal).' },
    ],
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DiningPlatingScreen() {
  const [tab, setTab] = useState<'etiquettes' | 'plating'>('etiquettes');
  const [expanded, setExpanded] = useState<number | null>(0);
  const scrollRef = useRef<ScrollView>(null);

  function switchTab(t: 'etiquettes' | 'plating') {
    setTab(t);
    setExpanded(0);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const data = tab === 'etiquettes' ? ETIQUETTES : PLATING;
  const intro = tab === 'etiquettes'
    ? 'Learn the art of Indian dining — from setting a thali to honoring your guests.'
    : 'Master the art of presenting Indian food — from the perfect thali to festive garnishes.';
  const accentColor = tab === 'etiquettes' ? '#C9A227' : '#1A6B3C';

  return (
    <ScreenWrapper title="Dining & Plating">
      {/* Tab switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabPill, tab === 'etiquettes' && s.tabPillActive]}
          onPress={() => switchTab('etiquettes')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabText, tab === 'etiquettes' && s.tabTextActive]}>Table Etiquettes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabPill, tab === 'plating' && s.tabPillActive]}
          onPress={() => switchTab('plating')}
          activeOpacity={0.8}
        >
          <Text style={[s.tabText, tab === 'plating' && s.tabTextActive]}>Traditional Plating</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.intro, { color: accentColor }]}>{intro}</Text>
        {data.map((section, si) => (
          <View key={`${tab}-${si}`} style={s.section}>
            <TouchableOpacity style={s.sectionHeader} onPress={() => setExpanded(expanded === si ? null : si)} activeOpacity={0.85}>
              <Text style={s.sectionIcon}>{section.icon}</Text>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.expandIcon}>{expanded === si ? '\u25B2' : '\u25BC'}</Text>
            </TouchableOpacity>
            {expanded === si && (
              <View style={s.sectionBody}>
                {section.items.map((item, ii) => (
                  <View key={ii} style={s.item}>
                    <Text style={[s.itemHeading, { color: accentColor }]}>{item.heading}</Text>
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
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  tabPill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#D4EDE5', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center' },
  tabPillActive: { backgroundColor: navy, borderColor: navy },
  tabText: { fontSize: 13, fontWeight: '600', color: navy },
  tabTextActive: { color: white },
  scroll: { padding: 16, maxWidth: 680, width: '100%', alignSelf: 'center' },
  intro: { fontSize: 14, lineHeight: 22, marginBottom: 20, fontStyle: 'italic' },
  section: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: navy },
  expandIcon: { color: midGray, fontSize: 14 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  item: { paddingTop: 14 },
  itemHeading: { fontSize: 13, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  itemContent: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
