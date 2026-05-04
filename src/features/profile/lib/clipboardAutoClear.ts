import * as Clipboard from 'expo-clipboard';

export interface ClipboardClearOptions {
  delayMs: number;
}

export function scheduleClipboardClear(
  copiedValue: string,
  { delayMs }: ClipboardClearOptions,
): () => void {
  const handle = setTimeout(() => {
    void (async () => {
      try {
        const current = await Clipboard.getStringAsync();
        if (current === copiedValue) {
          await Clipboard.setStringAsync('');
        }
      } catch {
        // Clipboard read failed (permission, platform issue) — leave clipboard alone.
      }
    })();
  }, delayMs);

  return () => clearTimeout(handle);
}
