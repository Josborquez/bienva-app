import { Platform } from 'react-native';

export async function requestPlanNotificationPermission() {
  if (Platform.OS === 'web') return;
  const notifications = await import('expo-notifications');
  const permission = await notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  }
}
