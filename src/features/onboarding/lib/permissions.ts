import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';

export async function maybeRequestNotifPermission(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'undetermined') {
      Sentry.addBreadcrumb({
        category: 'permissions.notif',
        level: 'info',
        message: 'Notif permission already decided — skipped prompt',
        data: { status: current.status },
      });
      return;
    }
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    Sentry.addBreadcrumb({
      category: 'permissions.notif',
      level: 'info',
      message: 'Notif permission prompt completed',
      data: { status: result.status },
    });
  } catch (err) {
    Sentry.addBreadcrumb({
      category: 'permissions.notif',
      level: 'warning',
      message: 'Notif permission request threw',
      data: { error: err instanceof Error ? err.message : String(err) },
    });
  }
}
