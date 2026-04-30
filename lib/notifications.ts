import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// expo-notifications is native-only — guard all usage behind Platform check
import * as Notifications from 'expo-notifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: current } = await Notifications.getPermissionsAsync();
    if (current === 'granted') return true;
    if (current !== 'undetermined') return false; // denied — skip silently
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function checkLipidExpiry(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const { data: members } = await supabase
    .from('family_members')
    .select('name, age, lipid_expiry_date')
    .eq('user_id', userId)
    .gte('age', 50);

  if (!members || members.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const member of members as { name: string; age: number; lipid_expiry_date: string | null }[]) {
    if (!member.lipid_expiry_date) continue;
    const expiry = new Date(member.lipid_expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Lipid Profile Expired',
          body: `${member.name}'s lipid profile has expired. Please consult your physician and upload the updated report in the Dietary Profile section.`,
        },
        trigger: null,
      });
    } else if (daysUntilExpiry <= 7) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Lipid Profile Expiring Soon',
          body: `${member.name}'s lipid profile expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please consult your physician and upload the updated report.`,
        },
        trigger: null,
      });
    }
  }
}

export interface LipidStatus {
  hasExpired: boolean;
  hasExpiringSoon: boolean;
  expiredNames: string[];
  expiringSoonNames: string[];
}

export async function getLipidStatus(userId: string): Promise<LipidStatus> {
  const result: LipidStatus = {
    hasExpired: false,
    hasExpiringSoon: false,
    expiredNames: [],
    expiringSoonNames: [],
  };

  const { data: members } = await supabase
    .from('family_members')
    .select('name, age, lipid_expiry_date')
    .eq('user_id', userId)
    .gte('age', 50);

  if (!members) return result;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const member of members as { name: string; age: number; lipid_expiry_date: string | null }[]) {
    if (!member.lipid_expiry_date) continue;
    const expiry = new Date(member.lipid_expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      result.hasExpired = true;
      result.expiredNames.push(member.name);
    } else if (days <= 7) {
      result.hasExpiringSoon = true;
      result.expiringSoonNames.push(member.name);
    }
  }

  return result;
}

// ─── Lab report reminder ─────────────────────────────────────────────────────

export async function scheduleLabReportReminder(memberName: string, uploadDate: Date): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = await AsyncStorage.getItem('notif_lab_reports');
  if (enabled === 'false') return;
  const reminderDate = new Date(uploadDate);
  reminderDate.setDate(reminderDate.getDate() + 75);
  if (reminderDate <= new Date()) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: `${memberName}'s lab report reminder`, body: `Time to update ${memberName}'s lab report and check if a specialist referral would help.` },
    trigger: { date: reminderDate } as any,
  });
  await AsyncStorage.setItem(`notif_lab_${memberName}`, id);
}

// ─── Insurance reminder ──────────────────────────────────────────────────────

export async function scheduleInsuranceReminder(expiryDate: Date): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = await AsyncStorage.getItem('notif_insurance_reminders');
  if (enabled === 'false') return;
  const reminderDate = new Date(expiryDate);
  reminderDate.setDate(reminderDate.getDate() - 7);
  if (reminderDate <= new Date()) return;
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Family insurance renewal reminder', body: 'Your family insurance expires in 7 days. Please renew to stay covered.' },
    trigger: { date: reminderDate } as any,
  });
  await AsyncStorage.setItem('notif_insurance', id);
}

// ─── Festival reminder ───────────────────────────────────────────────────────

export async function scheduleFestivalReminder(festivalName: string, festivalDate: Date): Promise<void> {
  if (Platform.OS === 'web') return;
  const enabled = await AsyncStorage.getItem('notif_festivals');
  if (enabled === 'false') return;
  const reminderDate = new Date(festivalDate);
  reminderDate.setDate(reminderDate.getDate() - 2);
  if (reminderDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: `${festivalName} is in 2 days`, body: `Plan your ${festivalName} meals with Maharaj.` },
    trigger: { date: reminderDate } as any,
  });
}

// ─── Sunday weekly meal plan push ────────────────────────────────────────────

export async function scheduleSundayReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  // Request permission warm — only call this after user has confirmed a plan
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return; // silently skip if denied

  // Cancel any existing Sunday reminder before rescheduling
  const existingId = await AsyncStorage.getItem('notif_sunday_reminder');
  if (existingId) {
    try { await Notifications.cancelScheduledNotificationAsync(existingId); } catch {}
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Aaj Khaane mein kya hai?',
      body: 'Plan your week with Maharaj. Takes 30 seconds.',
      data: { screen: 'meal-wizard' },
    },
    trigger: {
      weekday: 1, // 1 = Sunday in expo-notifications
      hour: 20,
      minute: 0,
      repeats: true,
    } as any,
  });
  await AsyncStorage.setItem('notif_sunday_reminder', id);
}

// ─── Ghost plan ready notification ───────────────────────────────────────────

export async function scheduleGhostPlanNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Maharaj has planned your week.',
        body: 'Review and approve in 30 seconds.',
        data: { screen: 'menu-history', ghost: true },
      },
      trigger: null,
    });
  } catch {}
}

// ─── Streak milestone notification ───────────────────────────────────────────

export async function scheduleStreakMilestoneNotification(streakWeeks: number, bankedWeeks: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Maharaj Streak — ' + streakWeeks + ' weeks',
        body: 'Maharaj has banked ' + bankedWeeks + ' free week' + (bankedWeeks > 1 ? 's' : '') + ' for your loyalty. Redeemable when billing goes live.',
      },
      trigger: null,
    });
  } catch {}
}

// ─── Cancel notification ─────────────────────────────────────────────────────

export async function cancelNotification(notifId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try { await Notifications.cancelScheduledNotificationAsync(notifId); } catch {}
}
