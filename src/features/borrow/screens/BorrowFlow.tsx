/**
 * BorrowFlow — hosts the Portola borrow embed in a WebView (Approach A).
 *
 * Loads our host page (which mounts Portola's iframe + the controller). The
 * host relays `sign` requests here; we sign each item with the borrower's EVM
 * wallet via Turnkey and inject the signatures back. `complete` dismisses;
 * `session_expired` re-mints.
 */
import { useCallback, useEffect, useRef, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';
import { useTurnkey } from '@turnkey/react-native-wallet-kit';
import { sansation } from '@/src/design-system/typography';
import { T } from '@/src/design-system/tokens';
import { usePortolaBorrow } from '../hooks/usePortolaBorrow';
import { signPortolaItem, type PortolaSignItem } from '../lib/portolaSigner';

// react-native-webview's class component types don't resolve under React 19's
// JSX (props collapse to `never`). Cast the value to a function component while
// keeping the real prop + ref types.
const WebViewEl = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebView> }
>;

// Host page on a Stealf-controlled origin (Approach A). Config, not a secret.
const HOST_URL =
  process.env.EXPO_PUBLIC_PORTOLA_HOST_URL ?? 'https://embed.stealf.xyz/portola';

type SignMessage = { portola: 1; kind: 'sign'; id: string; items: PortolaSignItem[] };

export function BorrowFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { embedUrl, start, remint, loading, error } = usePortolaBorrow();
  const { httpClient } = useTurnkey();
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    void start();
  }, [start]);

  const handleMessage = useCallback(
    async (e: WebViewMessageEvent) => {
      let msg: unknown;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      const data = msg as Record<string, unknown>;

      if (data.kind === 'sign' && Array.isArray((data as SignMessage).items)) {
        const req = data as SignMessage;
        if (!httpClient) return;
        try {
          const signatures: string[] = [];
          for (const item of req.items) {
            signatures.push(await signPortolaItem(item, httpClient));
          }
          webRef.current?.injectJavaScript(
            `window.__portolaReply(${JSON.stringify({ id: req.id, signatures })});true;`,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          webRef.current?.injectJavaScript(
            `window.__portolaReject(${JSON.stringify({ id: req.id, message })});true;`,
          );
        }
        return;
      }

      if (data.type === 'portola:complete') {
        // status: FUNDED | DECLINED | WITHDRAWN | EXPIRED
        router.back();
      } else if (data.type === 'portola:session_expired') {
        void remint();
      }
    },
    [httpClient, remint, router],
  );

  if (error) {
    return (
      <View style={center(insets.top)}>
        <Text style={[sansation, { color: T.ink, marginBottom: 16, textAlign: 'center' }]}>
          {error}
        </Text>
        <Pressable
          onPress={() => void start()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 100,
            borderWidth: 1,
            borderColor: T.hairline,
          }}
        >
          <Text style={[sansation, { color: T.ink, fontWeight: '700' }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !embedUrl) {
    return (
      <View style={center(insets.top)}>
        <ActivityIndicator color={T.ink} />
        <Text style={[sansation, { color: T.inkFaint, marginTop: 12 }]}>
          Preparing your loan…
        </Text>
      </View>
    );
  }

  const src = `${HOST_URL}?embed=${encodeURIComponent(embedUrl)}`;
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, paddingTop: insets.top }}>
      <WebViewEl
        ref={webRef}
        source={{ uri: src }}
        onMessage={handleMessage}
        // KYC needs the camera; grant inline media for the capture flow.
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        originWhitelist={['https://*']}
        style={{ flex: 1, backgroundColor: T.bg }}
      />
    </View>
  );
}

function center(top: number) {
  return {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: top,
    paddingHorizontal: 32,
    backgroundColor: T.bg,
  };
}
