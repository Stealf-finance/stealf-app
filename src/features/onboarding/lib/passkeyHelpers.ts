const TURNKEY_KEYCHAIN_PREFIX = 'com.turnkey.keypair:';
const TURNKEY_ASYNC_STORAGE_PREFIX = '@turnkey/';

export async function purgeTurnkeyKeychain(): Promise<void> {
  try {
    const Keychain = require('react-native-keychain');
    const services: string[] = await Keychain.getAllGenericPasswordServices();
    const orphans = services.filter((s) => s.startsWith(TURNKEY_KEYCHAIN_PREFIX));
    await Promise.all(
      orphans.map((service) =>
        Keychain.resetGenericPassword({ service }).catch(() => undefined),
      ),
    );
  } catch {
    // best-effort cleanup; swallow native errors
  }
}

export async function purgeTurnkeyAsyncStorage(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys: string[] = await AsyncStorage.getAllKeys();
    const turnkeyKeys = allKeys.filter((k) => k.startsWith(TURNKEY_ASYNC_STORAGE_PREFIX));
    if (turnkeyKeys.length > 0) await AsyncStorage.multiRemove(turnkeyKeys);
  } catch {
    // best-effort cleanup; swallow native errors
  }
}

export async function purgeTurnkeyState(): Promise<void> {
  await Promise.all([purgeTurnkeyAsyncStorage(), purgeTurnkeyKeychain()]);
}

export interface PasskeyErrorClassification {
  retryable: boolean;
  userMessage: string;
}

export function classifyPasskeyError(err: unknown): PasskeyErrorClassification {
  let cursor: any = err;
  let depth = 0;
  let retryable = false;

  while (cursor && depth < 5) {
    const code = cursor?.error ?? cursor?.code;
    const msg: string = cursor?.message ?? '';
    if (code === 'RequestFailed' || code === 'UserCancelled' || code === 'E_CRYPTO_FAILED') {
      retryable = true;
      break;
    }
    if (
      /no credentials|cancelled|canceled|timeout|timed out|failed to sign up with passkey|failed to delete unused key pair|network request failed|network request timed out|network error|empty key extracted|authentication tag verification failed/i.test(
        msg,
      )
    ) {
      retryable = true;
      break;
    }
    cursor = cursor?.cause;
    depth++;
  }

  const topMsg = (err as any)?.message ?? '';
  const causeMsg = (err as any)?.cause?.message ?? '';
  const combined = `${topMsg} ${causeMsg}`;

  const isNetwork = /network request failed|network request timed out|network error/i.test(combined);
  const isCryptoStore =
    (err as any)?.cause?.code === 'E_CRYPTO_FAILED' ||
    /empty key extracted|authentication tag verification failed|failed to delete unused key pair/i.test(combined);

  let userMessage: string;
  if (!retryable) {
    userMessage = topMsg || 'Failed to create passkey';
  } else if (isNetwork) {
    userMessage = 'Network error. Please check your connection and try again.';
  } else if (isCryptoStore) {
    userMessage = 'Device storage issue. Please restart the app and try again.';
  } else {
    userMessage = 'Face ID was cancelled or timed out. Please try again.';
  }

  return { retryable, userMessage };
}

export function sanitizePasskeyDisplayName(pseudo: string): string {
  return pseudo.replace(/[^a-zA-Z0-9 \-_:/]/g, '').slice(0, 50);
}
