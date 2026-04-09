import { Platform } from 'react-native';

// ─── Init ─────────────────────────────────────────────────────────────────────

// mixpanel-react-native is native-only — instantiate lazily, never on web
const TOKEN = '79c6ffac416f5ed569beb3ca100d7f6b';
let _mp: any = null;

function getMixpanel(): any | null {
  if (Platform.OS === 'web') return null;
  if (!_mp) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Mixpanel = require('mixpanel-react-native').default;
    _mp = new Mixpanel(TOKEN, /* trackAutomaticEvents */ true);
  }
  return _mp;
}

export async function initAnalytics() {
  if (Platform.OS === 'web') return;
  await getMixpanel()?.init();
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  const mp = getMixpanel();
  if (!mp) return;
  mp.identify(userId);
  if (props) mp.getPeople().set(props);
}

export function track(event: string, props?: Record<string, unknown>) {
  getMixpanel()?.track(event, props ?? {});
}
