import { Platform } from 'react-native';
import Mixpanel from 'mixpanel-react-native';

// ─── Init ─────────────────────────────────────────────────────────────────────

const TOKEN = '79c6ffac416f5ed569beb3ca100d7f6b';
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
