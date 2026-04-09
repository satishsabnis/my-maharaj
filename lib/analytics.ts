import { Platform } from 'react-native';
import Mixpanel from 'mixpanel-react-native';

// ─── Init ─────────────────────────────────────────────────────────────────────

const TOKEN = '4b2f9a1e8c3d7f6e0a5b2c4d8e1f3a7b'; // replace with real token from Mixpanel dashboard
const mixpanel = new Mixpanel(TOKEN, /* trackAutomaticEvents */ true);

export async function initAnalytics() {
  if (Platform.OS === 'web') return; // Mixpanel SDK is native-only; web would need JS SDK
  await mixpanel.init();
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (Platform.OS === 'web') return;
  mixpanel.identify(userId);
  if (props) mixpanel.getPeople().set(props);
}

export function track(event: string, props?: Record<string, unknown>) {
  if (Platform.OS === 'web') return;
  mixpanel.track(event, props ?? {});
}
