import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';

/**
 * Surface the notification permission prompt at account creation only.
 *
 * Detection of "first time" relies on the native iOS permission state
 * machine: a user who has never been asked has `status === 'undetermined'`.
 * Once they've granted or denied once, the status sticks and we skip the
 * call entirely on subsequent sign-ins. No persisted local flag needed —
 * the OS is already the source of truth.
 *
 * Failures are non-fatal: notifications are a nice-to-have, not blocking
 * any signup flow. We just breadcrumb the outcome to Sentry so we can
 * track grant rates.
 */
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
