// ─── My Maharaj Translations ─────────────────────────────────────────────────
// Add new languages by adding a key matching the language code from language-select.tsx
// All keys must be present in every language (fall back to English if missing)

export interface Translations {
  // Navigation
  back: string;
  home: string;
  exit: string;

  // Home screen
  appName: string;
  namaste: string;
  askMaharajAI: string;

  // Card titles
  festivals: string;
  dietaryProfile: string;
  generateMealPlan: string;
  partyMenu: string;
  outdoorCatering: string;
  menuHistory: string;
  tableEtiquettes: string;
  traditionalPlating: string;

  // Card descriptions
  upcomingCelebrations: string;
  healthAndCuisines: string;
  aiPoweredWeeklyPlan: string;
  planYourGathering: string;
  eventsAndPicnics: string;
  pastMealPlans: string;
  diningTraditions: string;
  presentFoodBeautifully: string;

  // Dietary Profile
  dietaryProfileTitle: string;
  addFamilyMember: string;
  noFamilyMembersYet: string;
  addMembersToPersonalise: string;
  cuisinePreferences: string;
  selectCuisinesToGuide: string;
  indianCuisines: string;
  internationalCuisines: string;
  saveCuisinePreferences: string;
  cuisinesSelected: string;
  editMember: string;
  addMember: string;
  saveChanges: string;
  cancel: string;
  name: string;
  age: string;
  healthConditions: string;
  medicalNotes: string;
  removeMember: string;
  saveMember: string;

  // Meal Wizard
  mealPlanWizard: string;
  generateMyMealPlan: string;
  selectPeriod: string;
  today: string;
  tomorrow: string;
  thisWeek: string;
  nextWeek: string;
  customRange: string;
  foodPreference: string;
  vegetarian: string;
  nonVegetarian: string;
  fastingOnly: string;
  guestOccasion: string;
  justMyFamily: string;
  weHaveGuests: string;
  useSavedCuisines: string;
  addSpecialCuisine: string;
  guestCuisine: string;
  forHowManyDays: string;
  mealPreferences: string;
  whoIsUnwell: string;
  everyoneIsFine: string;
  someoneIsUnwell: string;
  nutritionGoal: string;
  generating: string;
  maharajIsPreparing: string;
  yourMealPlan: string;
  confirmSelections: string;
  cookAtHome: string;
  orderOut: string;
  viewRecipes: string;
  groceryList: string;
  continueBtn: string;

  // Festivals
  festivalsTitle: string;
  upcoming: string;
  past: string;
  adjustMeals: string;

  // Menu History
  menuHistoryTitle: string;
  noMealPlansYet: string;
  generateFirstPlan: string;
  loadingMealHistory: string;

  // Party Menu
  partyMenuTitle: string;
  planYourEvent: string;
  numberOfGuests: string;
  occasion: string;
  foodType: string;
  budgetPerHead: string;
  generatePartyMenu: string;
  starters: string;
  mainCourse: string;
  desserts: string;
  drinks: string;
  shoppingList: string;

  // Outdoor Catering
  outdoorCateringTitle: string;
  planOutdoorEvent: string;
  eventType: string;
  servingSetup: string;
  weather: string;
  generateOutdoorMenu: string;
  packingTips: string;

  // Ask Maharaj
  askMaharajTitle: string;
  wiseMentor: string;
  askAboutFood: string;
  generateFullWeeklyPlan: string;
  consultingWisdom: string;
  typeYourQuestion: string;

  // Order Out
  orderOutTitle: string;
  deliveryRegion: string;
  tapToOrder: string;
  cookAtHomeInstead: string;
  apiComingSoon: string;

  // Common
  save: string;
  loading: string;
  error: string;
  retry: string;
  close: string;
  confirm: string;
  yrs: string;
  day: string;
  days: string;
  selected: string;
  poweredBy: string;
  website: string;

  // Language toggle
  switchToEnglish: string;
}

const en: Translations = {
  back: '← Back',
  home: '🏠',
  exit: 'Exit',
  appName: 'My Maharaj',
  namaste: 'Namaste',
  askMaharajAI: 'Ask Maharaj AI',
  festivals: 'Festivals',
  dietaryProfile: 'Dietary Profile',
  generateMealPlan: 'Generate Meal Plan',
  partyMenu: 'Party Menu',
  outdoorCatering: 'Outdoor Catering',
  menuHistory: 'Menu History',
  tableEtiquettes: 'Table Etiquettes',
  traditionalPlating: 'Traditional Plating',
  upcomingCelebrations: 'Upcoming celebrations',
  healthAndCuisines: 'Health & cuisines',
  aiPoweredWeeklyPlan: 'AI-powered weekly plan',
  planYourGathering: 'Plan your gathering',
  eventsAndPicnics: 'Events & picnics',
  pastMealPlans: 'Past meal plans',
  diningTraditions: 'Dining traditions',
  presentFoodBeautifully: 'Present food beautifully',
  dietaryProfileTitle: 'Dietary Profile',
  addFamilyMember: '+ Add Family Member',
  noFamilyMembersYet: 'No family members yet',
  addMembersToPersonalise: 'Add your family members to personalise meal plans',
  cuisinePreferences: 'Cuisine Preferences',
  selectCuisinesToGuide: 'Select cuisines to guide your meal plans',
  indianCuisines: 'Indian Cuisines',
  internationalCuisines: 'International Cuisines',
  saveCuisinePreferences: 'Save Cuisine Preferences',
  cuisinesSelected: 'cuisines selected',
  editMember: 'Edit',
  addMember: 'Add Member',
  saveChanges: 'Save Changes',
  cancel: 'Cancel',
  name: 'Name',
  age: 'Age',
  healthConditions: 'Health Conditions',
  medicalNotes: 'Medical Notes (optional)',
  removeMember: 'Remove member',
  saveMember: 'Save Member',
  mealPlanWizard: 'Meal Plan Wizard',
  generateMyMealPlan: '🍳 Generate My Meal Plan',
  selectPeriod: 'Select your meal period',
  today: 'Today',
  tomorrow: 'Tomorrow',
  thisWeek: 'This Week',
  nextWeek: 'Next Week',
  customRange: 'Custom Range',
  foodPreference: 'What do you prefer to eat?',
  vegetarian: 'Vegetarian',
  nonVegetarian: 'Non-Vegetarian',
  fastingOnly: 'Fasting',
  guestOccasion: 'Any guests joining?',
  justMyFamily: 'Just my family',
  weHaveGuests: 'We have guests',
  useSavedCuisines: 'Use saved cuisines',
  addSpecialCuisine: 'Add a special cuisine',
  guestCuisine: 'Guest Cuisine',
  forHowManyDays: 'For how many days?',
  mealPreferences: 'What would you like in each meal?',
  whoIsUnwell: 'Is anyone feeling unwell?',
  everyoneIsFine: 'Everyone is fine',
  someoneIsUnwell: 'Someone is unwell',
  nutritionGoal: 'Any nutrition goal?',
  generating: 'Generating...',
  maharajIsPreparing: 'Maharaj is preparing your meal plan...',
  yourMealPlan: 'Your Meal Plan',
  confirmSelections: 'Confirm Selections ✓',
  cookAtHome: 'Cook at Home',
  orderOut: 'Order Out',
  viewRecipes: 'View Recipes',
  groceryList: 'Grocery List',
  continueBtn: 'Continue →',
  festivalsTitle: 'Festivals & Functions',
  upcoming: 'Upcoming',
  past: 'Past',
  adjustMeals: 'Adjust meals',
  menuHistoryTitle: 'Menu History',
  noMealPlansYet: 'No meal plans yet',
  generateFirstPlan: 'Generate your first plan to see it here',
  loadingMealHistory: 'Loading your meal history...',
  partyMenuTitle: 'Party Menu Generator',
  planYourEvent: 'Plan Your Gathering',
  numberOfGuests: 'Number of Guests',
  occasion: 'Occasion',
  foodType: 'Food Preference',
  budgetPerHead: 'Budget per Head (AED)',
  generatePartyMenu: '🎉 Generate Party Menu',
  starters: 'Starters',
  mainCourse: 'Main Course',
  desserts: 'Desserts',
  drinks: 'Drinks',
  shoppingList: 'Shopping List',
  outdoorCateringTitle: 'Outdoor Catering',
  planOutdoorEvent: 'Plan Your Outdoor Event',
  eventType: 'Event Type',
  servingSetup: 'Serving Setup',
  weather: 'Weather / Conditions',
  generateOutdoorMenu: '🏕️ Generate Outdoor Menu',
  packingTips: 'Packing & Serving Tips',
  askMaharajTitle: 'Ask Maharaj AI',
  wiseMentor: 'Your Wise Nutrition Mentor',
  askAboutFood: 'Ask me anything about Indian food, nutrition, meal planning, or what to cook today.',
  generateFullWeeklyPlan: 'Generate Full Weekly Plan →',
  consultingWisdom: 'Consulting ancient wisdom...',
  typeYourQuestion: 'Ask about any dish, cuisine or meal plan...',
  orderOutTitle: 'Order Out',
  deliveryRegion: 'Delivery region:',
  tapToOrder: 'Tap to order →',
  cookAtHomeInstead: 'Cook at Home Instead',
  apiComingSoon: 'API integration with delivery partners coming after Pre-Seed funding.',
  save: 'Save',
  loading: 'Loading...',
  error: 'Error',
  retry: 'Try Again',
  close: '✕',
  confirm: 'Confirm',
  yrs: 'yrs',
  day: 'day',
  days: 'days',
  selected: 'selected',
  poweredBy: 'Powered by Blue Flute Consulting LLC-FZ',
  website: 'www.bluefluteconsulting.com',
  switchToEnglish: 'EN',
};

const hi: Translations = {
  back: '← वापस',
  home: '🏠',
  exit: 'बाहर',
  appName: 'माय महाराज',
  namaste: 'नमस्ते',
  askMaharajAI: 'महाराज AI से पूछें',
  festivals: 'त्योहार',
  dietaryProfile: 'आहार प्रोफ़ाइल',
  generateMealPlan: 'मील प्लान बनाएं',
  partyMenu: 'पार्टी मेनू',
  outdoorCatering: 'आउटडोर केटरिंग',
  menuHistory: 'मेनू इतिहास',
  tableEtiquettes: 'टेबल शिष्टाचार',
  traditionalPlating: 'पारंपरिक परोसना',
  upcomingCelebrations: 'आने वाले त्योहार',
  healthAndCuisines: 'स्वास्थ्य और व्यंजन',
  aiPoweredWeeklyPlan: 'AI साप्ताहिक योजना',
  planYourGathering: 'आयोजन की योजना बनाएं',
  eventsAndPicnics: 'कार्यक्रम और पिकनिक',
  pastMealPlans: 'पिछले मील प्लान',
  diningTraditions: 'खाने की परंपराएं',
  presentFoodBeautifully: 'खाना सुंदर परोसें',
  dietaryProfileTitle: 'आहार प्रोफ़ाइल',
  addFamilyMember: '+ परिवार सदस्य जोड़ें',
  noFamilyMembersYet: 'अभी कोई परिवार सदस्य नहीं',
  addMembersToPersonalise: 'मील प्लान को व्यक्तिगत बनाने के लिए परिवार जोड़ें',
  cuisinePreferences: 'व्यंजन प्राथमिकताएं',
  selectCuisinesToGuide: 'अपने मील प्लान के लिए व्यंजन चुनें',
  indianCuisines: 'भारतीय व्यंजन',
  internationalCuisines: 'अंतर्राष्ट्रीय व्यंजन',
  saveCuisinePreferences: 'व्यंजन प्राथमिकताएं सहेजें',
  cuisinesSelected: 'व्यंजन चुने गए',
  editMember: 'संपादित करें',
  addMember: 'सदस्य जोड़ें',
  saveChanges: 'बदलाव सहेजें',
  cancel: 'रद्द करें',
  name: 'नाम',
  age: 'उम्र',
  healthConditions: 'स्वास्थ्य स्थितियां',
  medicalNotes: 'चिकित्सा नोट्स (वैकल्पिक)',
  removeMember: 'सदस्य हटाएं',
  saveMember: 'सदस्य सहेजें',
  mealPlanWizard: 'मील प्लान विज़ार्ड',
  generateMyMealPlan: '🍳 मेरा मील प्लान बनाएं',
  selectPeriod: 'मील की अवधि चुनें',
  today: 'आज',
  tomorrow: 'कल',
  thisWeek: 'इस सप्ताह',
  nextWeek: 'अगले सप्ताह',
  customRange: 'कस्टम अवधि',
  foodPreference: 'आप क्या खाना पसंद करते हैं?',
  vegetarian: 'शाकाहारी',
  nonVegetarian: 'मांसाहारी',
  fastingOnly: 'व्रत',
  guestOccasion: 'क्या मेहमान आ रहे हैं?',
  justMyFamily: 'सिर्फ मेरा परिवार',
  weHaveGuests: 'मेहमान आ रहे हैं',
  useSavedCuisines: 'सहेजे व्यंजन उपयोग करें',
  addSpecialCuisine: 'विशेष व्यंजन जोड़ें',
  guestCuisine: 'मेहमान व्यंजन',
  forHowManyDays: 'कितने दिनों के लिए?',
  mealPreferences: 'प्रत्येक भोजन में क्या चाहिए?',
  whoIsUnwell: 'क्या कोई अस्वस्थ है?',
  everyoneIsFine: 'सब ठीक हैं',
  someoneIsUnwell: 'कोई अस्वस्थ है',
  nutritionGoal: 'कोई पोषण लक्ष्य?',
  generating: 'तैयार हो रहा है...',
  maharajIsPreparing: 'महाराज आपका मील प्लान तैयार कर रहे हैं...',
  yourMealPlan: 'आपका मील प्लान',
  confirmSelections: 'चयन की पुष्टि करें ✓',
  cookAtHome: 'घर पर बनाएं',
  orderOut: 'ऑर्डर करें',
  viewRecipes: 'रेसिपी देखें',
  groceryList: 'किराने की सूची',
  continueBtn: 'आगे बढ़ें →',
  festivalsTitle: 'त्योहार और समारोह',
  upcoming: 'आगामी',
  past: 'बीते हुए',
  adjustMeals: 'भोजन समायोजित करें',
  menuHistoryTitle: 'मेनू इतिहास',
  noMealPlansYet: 'अभी कोई मील प्लान नहीं',
  generateFirstPlan: 'यहाँ देखने के लिए पहला प्लान बनाएं',
  loadingMealHistory: 'मील इतिहास लोड हो रहा है...',
  partyMenuTitle: 'पार्टी मेनू जेनरेटर',
  planYourEvent: 'अपना आयोजन प्लान करें',
  numberOfGuests: 'मेहमानों की संख्या',
  occasion: 'अवसर',
  foodType: 'खाने की प्राथमिकता',
  budgetPerHead: 'प्रति व्यक्ति बजट (AED)',
  generatePartyMenu: '🎉 पार्टी मेनू बनाएं',
  starters: 'स्टार्टर',
  mainCourse: 'मुख्य कोर्स',
  desserts: 'मिठाई',
  drinks: 'पेय',
  shoppingList: 'खरीदारी सूची',
  outdoorCateringTitle: 'आउटडोर केटरिंग',
  planOutdoorEvent: 'बाहरी कार्यक्रम की योजना बनाएं',
  eventType: 'कार्यक्रम का प्रकार',
  servingSetup: 'परोसने का तरीका',
  weather: 'मौसम / परिस्थितियां',
  generateOutdoorMenu: '🏕️ आउटडोर मेनू बनाएं',
  packingTips: 'पैकिंग और परोसने के टिप्स',
  askMaharajTitle: 'महाराज AI से पूछें',
  wiseMentor: 'आपके बुद्धिमान पोषण सलाहकार',
  askAboutFood: 'भारतीय खाना, पोषण, मील प्लानिंग के बारे में कुछ भी पूछें।',
  generateFullWeeklyPlan: 'पूरा साप्ताहिक प्लान बनाएं →',
  consultingWisdom: 'प्राचीन ज्ञान से परामर्श ले रहे हैं...',
  typeYourQuestion: 'किसी भी व्यंजन, खाने के बारे में पूछें...',
  orderOutTitle: 'ऑर्डर करें',
  deliveryRegion: 'डिलीवरी क्षेत्र:',
  tapToOrder: 'ऑर्डर करने के लिए टैप करें →',
  cookAtHomeInstead: 'घर पर बनाएं',
  apiComingSoon: 'डिलीवरी पार्टनर्स के साथ API इंटीग्रेशन जल्द आएगा।',
  save: 'सहेजें',
  loading: 'लोड हो रहा है...',
  error: 'त्रुटि',
  retry: 'फिर कोशिश करें',
  close: '✕',
  confirm: 'पुष्टि करें',
  yrs: 'वर्ष',
  day: 'दिन',
  days: 'दिन',
  selected: 'चुने गए',
  poweredBy: 'Blue Flute Consulting LLC-FZ द्वारा संचालित',
  website: 'www.bluefluteconsulting.com',
  switchToEnglish: 'EN',
};

const mr: Translations = {
  back: '← मागे',
  home: '🏠',
  exit: 'बाहेर',
  appName: 'माय महाराज',
  namaste: 'नमस्कार',
  askMaharajAI: 'महाराज AI ला विचारा',
  festivals: 'सण',
  dietaryProfile: 'आहार प्रोफाईल',
  generateMealPlan: 'जेवण योजना बनवा',
  partyMenu: 'पार्टी मेनू',
  outdoorCatering: 'बाहेर केटरिंग',
  menuHistory: 'मेनू इतिहास',
  tableEtiquettes: 'जेवणाचे शिष्टाचार',
  traditionalPlating: 'पारंपरिक वाढणे',
  upcomingCelebrations: 'येणारे सण',
  healthAndCuisines: 'आरोग्य आणि पाककृती',
  aiPoweredWeeklyPlan: 'AI साप्ताहिक योजना',
  planYourGathering: 'कार्यक्रमाची योजना करा',
  eventsAndPicnics: 'कार्यक्रम आणि सहल',
  pastMealPlans: 'मागील जेवण योजना',
  diningTraditions: 'जेवणाच्या परंपरा',
  presentFoodBeautifully: 'जेवण सुंदर वाढा',
  dietaryProfileTitle: 'आहार प्रोफाईल',
  addFamilyMember: '+ कुटुंब सदस्य जोडा',
  noFamilyMembersYet: 'अजून कोणतेही कुटुंब सदस्य नाहीत',
  addMembersToPersonalise: 'जेवण योजना वैयक्तिक करण्यासाठी कुटुंब जोडा',
  cuisinePreferences: 'पाककृती प्राधान्ये',
  selectCuisinesToGuide: 'जेवण योजनेसाठी पाककृती निवडा',
  indianCuisines: 'भारतीय पाककृती',
  internationalCuisines: 'आंतरराष्ट्रीय पाककृती',
  saveCuisinePreferences: 'पाककृती प्राधान्ये जतन करा',
  cuisinesSelected: 'पाककृती निवडल्या',
  editMember: 'संपादित करा',
  addMember: 'सदस्य जोडा',
  saveChanges: 'बदल जतन करा',
  cancel: 'रद्द करा',
  name: 'नाव',
  age: 'वय',
  healthConditions: 'आरोग्य स्थिती',
  medicalNotes: 'वैद्यकीय नोट्स (पर्यायी)',
  removeMember: 'सदस्य काढा',
  saveMember: 'सदस्य जतन करा',
  mealPlanWizard: 'जेवण योजना विझार्ड',
  generateMyMealPlan: '🍳 माझी जेवण योजना बनवा',
  selectPeriod: 'जेवणाचा कालावधी निवडा',
  today: 'आज',
  tomorrow: 'उद्या',
  thisWeek: 'या आठवड्यात',
  nextWeek: 'पुढच्या आठवड्यात',
  customRange: 'सानुकूल कालावधी',
  foodPreference: 'तुम्हाला काय खायला आवडते?',
  vegetarian: 'शाकाहारी',
  nonVegetarian: 'मांसाहारी',
  fastingOnly: 'उपवास',
  guestOccasion: 'पाहुणे येत आहेत का?',
  justMyFamily: 'फक्त माझे कुटुंब',
  weHaveGuests: 'पाहुणे येत आहेत',
  useSavedCuisines: 'जतन केलेल्या पाककृती वापरा',
  addSpecialCuisine: 'विशेष पाककृती जोडा',
  guestCuisine: 'पाहुण्यांसाठी पाककृती',
  forHowManyDays: 'किती दिवसांसाठी?',
  mealPreferences: 'प्रत्येक जेवणात काय असावे?',
  whoIsUnwell: 'कोणाला बरे वाटत नाही का?',
  everyoneIsFine: 'सगळे ठीक आहेत',
  someoneIsUnwell: 'कोणाला बरे नाही',
  nutritionGoal: 'काही पोषण ध्येय आहे का?',
  generating: 'तयार होत आहे...',
  maharajIsPreparing: 'महाराज तुमची जेवण योजना तयार करत आहेत...',
  yourMealPlan: 'तुमची जेवण योजना',
  confirmSelections: 'निवड पुष्टी करा ✓',
  cookAtHome: 'घरी शिजवा',
  orderOut: 'ऑर्डर करा',
  viewRecipes: 'पाककृती पाहा',
  groceryList: 'किराणा यादी',
  continueBtn: 'पुढे जा →',
  festivalsTitle: 'सण आणि समारंभ',
  upcoming: 'येणारे',
  past: 'गेलेले',
  adjustMeals: 'जेवण समायोजित करा',
  menuHistoryTitle: 'मेनू इतिहास',
  noMealPlansYet: 'अजून कोणतीही जेवण योजना नाही',
  generateFirstPlan: 'येथे पाहण्यासाठी पहिली योजना बनवा',
  loadingMealHistory: 'जेवण इतिहास लोड होत आहे...',
  partyMenuTitle: 'पार्टी मेनू जनरेटर',
  planYourEvent: 'तुमचा कार्यक्रम नियोजित करा',
  numberOfGuests: 'पाहुण्यांची संख्या',
  occasion: 'प्रसंग',
  foodType: 'खाण्याची प्राधान्ये',
  budgetPerHead: 'प्रति व्यक्ती बजेट (AED)',
  generatePartyMenu: '🎉 पार्टी मेनू बनवा',
  starters: 'स्टार्टर',
  mainCourse: 'मुख्य जेवण',
  desserts: 'मिठाई',
  drinks: 'पेय',
  shoppingList: 'खरेदी यादी',
  outdoorCateringTitle: 'बाहेर केटरिंग',
  planOutdoorEvent: 'बाहेरच्या कार्यक्रमाची योजना करा',
  eventType: 'कार्यक्रमाचा प्रकार',
  servingSetup: 'वाढण्याची पद्धत',
  weather: 'हवामान / परिस्थिती',
  generateOutdoorMenu: '🏕️ बाहेरचा मेनू बनवा',
  packingTips: 'पॅकिंग आणि वाढण्याच्या टिप्स',
  askMaharajTitle: 'महाराज AI ला विचारा',
  wiseMentor: 'तुमचे बुद्धिमान पोषण मार्गदर्शक',
  askAboutFood: 'भारतीय खाणे, पोषण, जेवण नियोजनाबद्दल काहीही विचारा।',
  generateFullWeeklyPlan: 'संपूर्ण साप्ताहिक योजना बनवा →',
  consultingWisdom: 'प्राचीन ज्ञानाचा सल्ला घेत आहे...',
  typeYourQuestion: 'कोणत्याही पदार्थाबद्दल विचारा...',
  orderOutTitle: 'ऑर्डर करा',
  deliveryRegion: 'डिलिव्हरी क्षेत्र:',
  tapToOrder: 'ऑर्डर करण्यासाठी टॅप करा →',
  cookAtHomeInstead: 'घरी शिजवा',
  apiComingSoon: 'डिलिव्हरी पार्टनर्ससह API इंटिग्रेशन लवकरच येईल।',
  save: 'जतन करा',
  loading: 'लोड होत आहे...',
  error: 'त्रुटी',
  retry: 'पुन्हा प्रयत्न करा',
  close: '✕',
  confirm: 'पुष्टी करा',
  yrs: 'वर्षे',
  day: 'दिवस',
  days: 'दिवस',
  selected: 'निवडले',
  poweredBy: 'Blue Flute Consulting LLC-FZ द्वारे संचालित',
  website: 'www.bluefluteconsulting.com',
  switchToEnglish: 'EN',
};

const gu: Translations = {
  back: '← પાછળ',
  home: '🏠',
  exit: 'બહાર',
  appName: 'માય મહારાજ',
  namaste: 'નમસ્તે',
  askMaharajAI: 'મહારાજ AI ને પૂછો',
  festivals: 'તહેવારો',
  dietaryProfile: 'આહાર પ્રોફાઇલ',
  generateMealPlan: 'ભોજન યોજના બનાવો',
  partyMenu: 'પાર્ટી મેનુ',
  outdoorCatering: 'આઉટડોર કેટરિંગ',
  menuHistory: 'મેનુ ઇતિહાસ',
  tableEtiquettes: 'ટેબલ શિષ્ટાચાર',
  traditionalPlating: 'પરંપરાગત પ્રસ્તુતિ',
  upcomingCelebrations: 'આગામી ઉત્સવો',
  healthAndCuisines: 'સ્વાસ્થ્ય અને વ્યંજન',
  aiPoweredWeeklyPlan: 'AI સાપ્તાહિક યોજના',
  planYourGathering: 'મેળાવડો આયોજિત કરો',
  eventsAndPicnics: 'ઇવેન્ટ્સ અને પિકનિક',
  pastMealPlans: 'જૂની ભોજન યોજનાઓ',
  diningTraditions: 'ભોજનની પરંપરાઓ',
  presentFoodBeautifully: 'ભોજન સુંદર રીતે પીરસો',
  dietaryProfileTitle: 'આહાર પ્રોફાઇલ',
  addFamilyMember: '+ પરિવાર સભ્ય ઉમેરો',
  noFamilyMembersYet: 'હજુ કોઈ પરિવાર સભ્ય નથી',
  addMembersToPersonalise: 'ભોજન યોજના વ્યક્તિગત બનાવવા પરિવાર ઉમેરો',
  cuisinePreferences: 'વ્યંજન પ્રાધાન્યતા',
  selectCuisinesToGuide: 'ભોજન યોજના માટે વ્યંજન પસંદ કરો',
  indianCuisines: 'ભારતીય વ્યંજન',
  internationalCuisines: 'આંતરરાષ્ટ્રીય વ્યંજન',
  saveCuisinePreferences: 'વ્યંજન પ્રાધાન્યતા સાચવો',
  cuisinesSelected: 'વ્યંજન પસંદ કર્યા',
  editMember: 'સંપાદિત કરો',
  addMember: 'સભ્ય ઉમેરો',
  saveChanges: 'ફેરફાર સાચવો',
  cancel: 'રદ કરો',
  name: 'નામ',
  age: 'ઉંમર',
  healthConditions: 'સ્વાસ્થ્ય સ્થિતિ',
  medicalNotes: 'તબીબી નોંધ (વૈકલ્પિક)',
  removeMember: 'સભ્ય દૂર કરો',
  saveMember: 'સભ્ય સાચવો',
  mealPlanWizard: 'ભોજન યોજના વિઝાર્ડ',
  generateMyMealPlan: '🍳 મારી ભોજન યોજના બનાવો',
  selectPeriod: 'ભોજનનો સમયગાળો પસંદ કરો',
  today: 'આજ',
  tomorrow: 'કાલ',
  thisWeek: 'આ અઠવાડિયે',
  nextWeek: 'આવતા અઠવાડિયે',
  customRange: 'કસ્ટમ સ્યયે',
  foodPreference: 'તમે શું ખાવાનું પસંદ કરો છો?',
  vegetarian: 'શાકાહારી',
  nonVegetarian: 'માંસાહારી',
  fastingOnly: 'ઉપવાસ',
  guestOccasion: 'શું મહેમાન આવે છે?',
  justMyFamily: 'ફક્ત મારો પરિવાર',
  weHaveGuests: 'મહેમાન આવે છે',
  useSavedCuisines: 'સાચવેલ વ્યંજન વાપરો',
  addSpecialCuisine: 'ખાસ વ્યંજન ઉમેરો',
  guestCuisine: 'મહેમાન વ્યંજન',
  forHowManyDays: 'કેટલા દિવસ માટે?',
  mealPreferences: 'દરેક ભોજનમાં શું જોઈએ?',
  whoIsUnwell: 'શું કોઈ બીમાર છે?',
  everyoneIsFine: 'બધા ઠીક છે',
  someoneIsUnwell: 'કોઈ બીમાર છે',
  nutritionGoal: 'કોઈ પોષણ લક્ષ્ય?',
  generating: 'બની રહ્યું છે...',
  maharajIsPreparing: 'મહારાજ તમારી ભોજન યોજના તૈયાર કરી રહ્યા છે...',
  yourMealPlan: 'તમારી ભોજન યોજના',
  confirmSelections: 'પસંદ ની પુષ્ટી ✓',
  cookAtHome: 'ઘરે રાંધો',
  orderOut: 'ઓર્ડર કરો',
  viewRecipes: 'રેસીપી જુઓ',
  groceryList: 'કિરાણો યાદી',
  continueBtn: 'આગળ →',
  festivalsTitle: 'તહેવારો અને ઉત્સવો',
  upcoming: 'આગામી',
  past: 'ગયેલ',
  adjustMeals: 'ભોજન ગોઠવો',
  menuHistoryTitle: 'મેનુ ઇતિહાસ',
  noMealPlansYet: 'હજુ કોઈ ભોજન યોજના નથી',
  generateFirstPlan: 'અહીં જોવા માટે પ્રથમ યોજના બનાવો',
  loadingMealHistory: 'ભોજન ઇતિહાસ લોડ થઈ રહ્યો છે...',
  partyMenuTitle: 'પાર્ટી મેનુ જનરેટર',
  planYourEvent: 'તમારો કાર્યક્રમ આયોજિત કરો',
  numberOfGuests: 'મહેમાનોની સંખ્યા',
  occasion: 'પ્રસંગ',
  foodType: 'ભોજનની પ્રાધાન્યતા',
  budgetPerHead: 'પ્રતિ વ્યક્તિ બજેટ (AED)',
  generatePartyMenu: '🎉 પાર્ટી મેનુ બનાવો',
  starters: 'સ્ટાર્ટર',
  mainCourse: 'મુખ્ય ભોજન',
  desserts: 'મીઠાઈ',
  drinks: 'પીણા',
  shoppingList: 'ખરીદી યાદી',
  outdoorCateringTitle: 'આઉટડોર કેટરિંગ',
  planOutdoorEvent: 'બહારના કાર્યક્રમ ની યોજના',
  eventType: 'કાર્યક્રમ પ્રકાર',
  servingSetup: 'પીરસવાની પદ્ધતિ',
  weather: 'હવામાન / સ્થિતિ',
  generateOutdoorMenu: '🏕️ આઉટડોર મેનુ બનાવો',
  packingTips: 'પૅકિંગ અને પીરસવાની ટિપ્સ',
  askMaharajTitle: 'મહારાજ AI ને પૂછો',
  wiseMentor: 'તમારા બુદ્ધિમાન પોષણ માર્ગદર્શક',
  askAboutFood: 'ભારતીય ભોજન, પોષણ, ભોજન આયોજન વિશે કઈ પણ પૂછો.',
  generateFullWeeklyPlan: 'સંપૂર્ણ સાપ્તાહિક યોજના → ',
  consultingWisdom: 'પ્રાચીન જ્ઞાન સાથે સલાહ...',
  typeYourQuestion: 'કોઈ પણ ભોજન વિશે પૂછો...',
  orderOutTitle: 'ઓર્ડર કરો',
  deliveryRegion: 'ડિલિવરી ક્ષેત્ર:',
  tapToOrder: 'ઓર્ડર કરવા ટૅપ કરો →',
  cookAtHomeInstead: 'ઘરે રાંધો',
  apiComingSoon: 'ડિલિવરી ભાગીદારો સાથે API ઇન્ટિગ્રેશન ટૂંક સમયમાં.',
  save: 'સાચવો',
  loading: 'લોડ થઈ રહ્યું છે...',
  error: 'ભૂલ',
  retry: 'ફરી પ્રયાસ',
  close: '✕',
  confirm: 'પુષ્ટ કરો',
  yrs: 'વર્ષ',
  day: 'દિ',
  days: 'દિ',
  selected: 'પસંદ',
  poweredBy: 'Blue Flute Consulting LLC-FZ દ્વારા સંચાલિત',
  website: 'www.bluefluteconsulting.com',
  switchToEnglish: 'EN',
};

const ta: Translations = {
  back: '← பின்',
  home: '🏠',
  exit: 'வெளியேறு',
  appName: 'மை மகாராஜ்',
  namaste: 'வணக்கம்',
  askMaharajAI: 'மகாராஜ் AI கேளுங்கள்',
  festivals: 'திருவிழாக்கள்',
  dietaryProfile: 'உணவு விவரம்',
  generateMealPlan: 'உணவு திட்டம் உருவாக்கு',
  partyMenu: 'விருந்து பட்டியல்',
  outdoorCatering: 'வெளிப்புற உணவு சேவை',
  menuHistory: 'மெனு வரலாறு',
  tableEtiquettes: 'மேஜை ஒழுக்கங்கள்',
  traditionalPlating: 'பாரம்பரிய பரிமாறல்',
  upcomingCelebrations: 'வரவிருக்கும் விழாக்கள்',
  healthAndCuisines: 'ஆரோக்கியம் & சமையல்',
  aiPoweredWeeklyPlan: 'AI வாராந்திர திட்டம்',
  planYourGathering: 'கூட்டத்தை திட்டமிடுங்கள்',
  eventsAndPicnics: 'நிகழ்வுகள் & சுற்றுலா',
  pastMealPlans: 'கடந்த உணவு திட்டங்கள்',
  diningTraditions: 'உணவு மரபுகள்',
  presentFoodBeautifully: 'உணவை அழகாக பரிமாறுங்கள்',
  dietaryProfileTitle: 'உணவு விவரம்',
  addFamilyMember: '+ குடும்ப உறுப்பினர் சேர்',
  noFamilyMembersYet: 'இன்னும் குடும்ப உறுப்பினர்கள் இல்லை',
  addMembersToPersonalise: 'உணவு திட்டத்தை தனிப்பயனாக்க குடும்பத்தினரை சேர்க்கவும்',
  cuisinePreferences: 'சமையல் விருப்பங்கள்',
  selectCuisinesToGuide: 'உணவு திட்டத்திற்கு சமையல் தேர்வு செய்யுங்கள்',
  indianCuisines: 'இந்திய சமையல்கள்',
  internationalCuisines: 'சர்வதேச சமையல்கள்',
  saveCuisinePreferences: 'சமையல் விருப்பங்கள் சேமி',
  cuisinesSelected: 'சமையல்கள் தேர்ந்தெடுக்கப்பட்டன',
  editMember: 'திருத்து',
  addMember: 'உறுப்பினர் சேர்',
  saveChanges: 'மாற்றங்கள் சேமி',
  cancel: 'ரத்து',
  name: 'பெயர்',
  age: 'வயது',
  healthConditions: 'உடல்நல நிலைகள்',
  medicalNotes: 'மருத்துவ குறிப்புகள் (விருப்பமானது)',
  removeMember: 'உறுப்பினரை நீக்கு',
  saveMember: 'உறுப்பினரை சேமி',
  mealPlanWizard: 'உணவு திட்ட வழிகாட்டி',
  generateMyMealPlan: '🍳 என் உணவு திட்டம் உருவாக்கு',
  selectPeriod: 'உணவு காலத்தை தேர்வு செய்யுங்கள்',
  today: 'இன்று',
  tomorrow: 'நாளை',
  thisWeek: 'இந்த வாரம்',
  nextWeek: 'அடுத்த வாரம்',
  customRange: 'தனிப்பயன் வரம்பு',
  foodPreference: 'நீங்கள் என்ன சாப்பிட விரும்புகிறீர்கள்?',
  vegetarian: 'சைவம்',
  nonVegetarian: 'அசைவம்',
  fastingOnly: 'விரதம்',
  guestOccasion: 'விருந்தினர் வருகிறார்களா?',
  justMyFamily: 'என் குடும்பம் மட்டும்',
  weHaveGuests: 'விருந்தினர் வருகிறார்கள்',
  useSavedCuisines: 'சேமிக்கப்பட்ட சமையல் பயன்படுத்து',
  addSpecialCuisine: 'சிறப்பு சமையல் சேர்',
  guestCuisine: 'விருந்தினர் சமையல்',
  forHowManyDays: 'எத்தனை நாட்களுக்கு?',
  mealPreferences: 'ஒவ்வொரு வேளையிலும் என்ன வேண்டும்?',
  whoIsUnwell: 'யாரேனும் உடல்நிலை சரியில்லையா?',
  everyoneIsFine: 'எல்லாரும் நலமாக இருக்கிறார்கள்',
  someoneIsUnwell: 'யாரோ உடல்நிலை சரியில்லை',
  nutritionGoal: 'ஏதாவது ஊட்டச்சத்து இலக்கு?',
  generating: 'உருவாக்கப்படுகிறது...',
  maharajIsPreparing: 'மகாராஜ் உங்கள் உணவு திட்டத்தை தயாரிக்கிறார்...',
  yourMealPlan: 'உங்கள் உணவு திட்டம்',
  confirmSelections: 'தேர்வுகளை உறுதிப்படுத்து ✓',
  cookAtHome: 'வீட்டில் சமை',
  orderOut: 'ஆர்டர் செய்',
  viewRecipes: 'சமையல் முறைகள் பார்',
  groceryList: 'மளிகை பட்டியல்',
  continueBtn: 'தொடர்க →',
  festivalsTitle: 'திருவிழாக்கள் & நிகழ்வுகள்',
  upcoming: 'வரவிருக்கும்',
  past: 'கடந்த',
  adjustMeals: 'உணவை சரிசெய்',
  menuHistoryTitle: 'மெனு வரலாறு',
  noMealPlansYet: 'இன்னும் உணவு திட்டங்கள் இல்லை',
  generateFirstPlan: 'இங்கே காண முதல் திட்டம் உருவாக்கு',
  loadingMealHistory: 'உணவு வரலாறு ஏற்றப்படுகிறது...',
  partyMenuTitle: 'விருந்து மெனு உருவாக்கி',
  planYourEvent: 'உங்கள் நிகழ்வை திட்டமிடுங்கள்',
  numberOfGuests: 'விருந்தினர் எண்ணிக்கை',
  occasion: 'சந்தர்ப்பம்',
  foodType: 'உணவு விருப்பம்',
  budgetPerHead: 'தலைக்கு பட்ஜெட் (AED)',
  generatePartyMenu: '🎉 விருந்து மெனு உருவாக்கு',
  starters: 'ஆரம்ப உணவுகள்',
  mainCourse: 'முதன்மை உணவு',
  desserts: 'இனிப்புகள்',
  drinks: 'பானங்கள்',
  shoppingList: 'கொள்முதல் பட்டியல்',
  outdoorCateringTitle: 'வெளிப்புற உணவு சேவை',
  planOutdoorEvent: 'வெளிப்புற நிகழ்வை திட்டமிடு',
  eventType: 'நிகழ்வு வகை',
  servingSetup: 'பரிமாறல் முறை',
  weather: 'வானிலை / நிலைமைகள்',
  generateOutdoorMenu: '🏕️ வெளிப்புற மெனு உருவாக்கு',
  packingTips: 'பேக்கிங் & பரிமாறல் குறிப்புகள்',
  askMaharajTitle: 'மகாராஜ் AI கேளுங்கள்',
  wiseMentor: 'உங்கள் ஞானமிக்க ஊட்டச்சத்து வழிகாட்டி',
  askAboutFood: 'இந்திய உணவு, ஊட்டச்சத்து, உணவு திட்டமிடல் பற்றி எதுவும் கேளுங்கள்.',
  generateFullWeeklyPlan: 'முழு வாராந்திர திட்டம் →',
  consultingWisdom: 'பண்டைய ஞானத்தை ஆலோசிக்கிறது...',
  typeYourQuestion: 'எந்த உணவு பற்றியும் கேளுங்கள்...',
  orderOutTitle: 'ஆர்டர் செய்',
  deliveryRegion: 'டெலிவரி பகுதி:',
  tapToOrder: 'ஆர்டர் செய்ய தட்டவும் →',
  cookAtHomeInstead: 'வீட்டில் சமையுங்கள்',
  apiComingSoon: 'டெலிவரி நிறுவனங்களுடன் API ஒருங்கிணைப்பு விரைவில் வரும்.',
  save: 'சேமி',
  loading: 'ஏற்றப்படுகிறது...',
  error: 'பிழை',
  retry: 'மீண்டும் முயற்சி',
  close: '✕',
  confirm: 'உறுதிப்படுத்து',
  yrs: 'வயது',
  day: 'நாள்',
  days: 'நாட்கள்',
  selected: 'தேர்ந்தெடுக்கப்பட்டது',
  poweredBy: 'Blue Flute Consulting LLC-FZ ஆல் இயக்கப்படுகிறது',
  website: 'www.bluefluteconsulting.com',
  switchToEnglish: 'EN',
};

// ─── Translation map ──────────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, Translations> = {
  en,
  hi,
  mr,
  gu,
  ta,
  // All other languages fall back to English
  // Add more languages here as needed
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function getTranslations(langCode: string): Translations {
  return TRANSLATIONS[langCode] ?? TRANSLATIONS['en'];
}

// ─── Language Context ─────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface LangContextType {
  lang: string;
  t: Translations;
  setLang: (code: string) => void;
  isEnglish: boolean;
  toggleEnglish: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  t: en,
  setLang: () => {},
  isEnglish: true,
  toggleEnglish: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang,        setLangState]  = useState('en');
  const [prevLang,    setPrevLang]   = useState('en');
  const [isEnglish,   setIsEnglish]  = useState(true);

  useEffect(() => {
    async function loadLang() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles')
          .select('app_language').eq('id', user.id).maybeSingle();
        const saved = data?.app_language ?? 'en';
        setLangState(saved);
        setPrevLang(saved);
        setIsEnglish(saved === 'en');
      } catch (e) { console.error(e); }
    }
    void loadLang();
  }, []);

  function setLang(code: string) {
    setLangState(code);
    setPrevLang(code);
    setIsEnglish(code === 'en');
  }

  function toggleEnglish() {
    if (isEnglish && prevLang !== 'en') {
      // Switch back to preferred language
      setLangState(prevLang);
      setIsEnglish(false);
    } else {
      // Switch to English
      setPrevLang(lang);
      setLangState('en');
      setIsEnglish(true);
    }
  }

  const t = getTranslations(lang);

  return (
    <LangContext.Provider value={{ lang, t, setLang, isEnglish, toggleEnglish }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export default TRANSLATIONS;
