const TURNKEY_KEYCHAIN_PREFIX = 'com.turnkey.keypair:';
const TURNKEY_ASYNC_STORAGE_PREFIX = '@turnkey/';

async function purgeTurnkeyKeychain(): Promise<void> {
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

async function purgeTurnkeyAsyncStorage(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const allKeys: string[] = await AsyncStorage.getAllKeys();
    const turnkeyKeys = allKeys.filter((k) =>
      k.startsWith(TURNKEY_ASYNC_STORAGE_PREFIX),
    );
    if (turnkeyKeys.length > 0) await AsyncStorage.multiRemove(turnkeyKeys);
  } catch {
    // best-effort cleanup; swallow native errors
  }
}

/** Clear Turnkey's local Keychain + AsyncStorage residue on logout / delete. */
export async function purgeTurnkeyState(): Promise<void> {
  await Promise.all([purgeTurnkeyAsyncStorage(), purgeTurnkeyKeychain()]);
}
