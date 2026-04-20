export interface FestivalEntry {
  name: string;
  date: string; // 'DD Mon' e.g. '13 Jan'
  food: string;
}

export const FESTIVALS_2026: FestivalEntry[] = [
  { name: 'Lohri', date: '13 Jan', food: 'Sarson da Saag, Makki Roti, Gajak, Til Rewdi' },
  { name: 'Makar Sankranti / Pongal', date: '14 Jan', food: 'Til Laddoo, Pongal rice, Gajak, Chikki' },
  { name: 'Maha Shivratri', date: '26 Feb', food: 'Sabudana Khichdi, fruits, milk, no non-veg' },
  { name: 'Holi', date: '4 Mar', food: 'Gujiya, Thandai, Dahi Bhalle, Malpua' },
  { name: 'Eid ul Fitr', date: '20 Mar', food: 'Biryani, Sheer Kurma, Seviyan' },
  { name: 'Gudi Padwa / Ugadi', date: '21 Mar', food: 'Puran Poli, Shrikhand, Aam Panha' },
  { name: 'Ram Navami', date: '27 Mar', food: 'Panchamrit, Panjiri, fruits, no non-veg' },
  { name: 'Hanuman Jayanti', date: '10 Apr', food: 'Prasad, fruit chaat, no non-veg' },
  { name: 'Baisakhi', date: '14 Apr', food: 'Sarson da Saag, Makki Roti, Lassi, Meethe Chawal' },
  { name: 'Akshaya Tritiya', date: '29 Apr', food: 'Sattvic food, sweets, fruits' },
  { name: 'Eid ul Adha', date: '27 May', food: 'Mutton dishes, Biryani, Haleem' },
  { name: 'Guru Purnima', date: '3 Jul', food: 'Langar food, dal, rice, kheer' },
  { name: 'Independence Day', date: '15 Aug', food: 'Tri-colour sweets, festive thali' },
  { name: 'Janmashtami', date: '17 Aug', food: 'Makhana, Panchamrit, Panjiri, Dahi Handi' },
  { name: 'Ganesh Chaturthi', date: '24 Aug', food: 'Modak, Ukadiche Modak, Varan Bhaat' },
  { name: 'Raksha Bandhan', date: '3 Sep', food: 'Sweets, mithai, festive thali' },
  { name: 'Navratri begins', date: '12 Oct', food: 'Vrat food, Sabudana, Kuttu, fruits' },
  { name: 'Karwa Chauth', date: '16 Oct', food: 'Sargi thali, moon-viewing sweets, halwa' },
  { name: 'Dussehra', date: '21 Oct', food: 'Regional sweets, festive meals' },
  { name: 'Guru Nanak Jayanti', date: '5 Nov', food: 'Langar food, dal, rice, kheer' },
  { name: 'Diwali', date: '8 Nov', food: 'Mithai, Farsan, Faral, Chakli' },
  { name: 'Christmas', date: '25 Dec', food: 'Plum cake, roast, festive sweets' },
];
