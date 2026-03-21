import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
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
