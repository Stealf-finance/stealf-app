/**
 * BorrowFlow — hosts the Portola borrow embed in a WebView (Approach A).
 *
 * Loads our host page (which mounts Portola's iframe + the controller). The
 * host relays `sign` requests here; we sign each item with the borrower's EVM
 * wallet via Turnkey and inject the signatures back. `complete` dismisses;
 * `session_expired` re-mints.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
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
  const { embedUrl, start, remint, loading, step, error } = usePortolaBorrow();
  const { httpClient } = useTurnkey();
  const webRef = useRef<WebView>(null);

  // Diagnostics: the cross-origin Portola embed is a black box from RN, so we
  // surface WebView load/HTTP/JS events + the iframe's load status on-screen to
  // pin down a blank/black render (iframe blocked vs HTTP error vs blank SPA).
  const [debug, setDebug] = useState<string[]>([]);
  const log = useCallback(
    (m: string) => setDebug((d) => [...d.slice(-8), m]),
    [],
  );

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

      if (data.type === 'portola:debug') {
        log(String(data.msg ?? ''));
        return;
      }

      if (data.type === 'portola:complete') {
        // status: FUNDED | DECLINED | WITHDRAWN | EXPIRED
        router.back();
      } else if (data.type === 'portola:session_expired') {
        void remint();
      }
    },
    [httpClient, remint, router, log],
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
    const stepLabel =
      step === 'wallet'
        ? 'Preparing your wallet…'
        : step === 'session'
          ? 'Requesting your loan session…'
          : 'Preparing your loan…';
    return (
      <View style={center(insets.top)}>
        <ActivityIndicator color={T.ink} />
        <Text style={[sansation, { color: T.inkFaint, marginTop: 12 }]}>
          {stepLabel}
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
        onLoadStart={(e) =>
          log(`load:start ${String(e.nativeEvent?.url ?? '').slice(0, 44)}`)
        }
        onLoadEnd={(e) =>
          log(`load:end ${String(e.nativeEvent?.url ?? '').slice(0, 44)}`)
        }
        onError={(e) =>
          log(`ERR ${e.nativeEvent?.code ?? ''} ${e.nativeEvent?.description ?? ''}`)
        }
        onHttpError={(e) =>
          log(
            `HTTP ${e.nativeEvent?.statusCode ?? ''} ${String(
              e.nativeEvent?.url ?? '',
            ).slice(0, 40)}`,
          )
        }
        // Monitor the host page + Portola iframe from the main frame and report
        // status back over the bridge (portola:debug). Cross-origin content is
        // opaque, but the iframe's load/error events + presence tell us whether
        // the frame was blocked (X-Frame-Options) or just rendered blank.
        injectedJavaScript={`(function(){
          try{
            function rn(m){ try{ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'portola:debug',msg:String(m)})); }catch(e){} }
            window.addEventListener('error', function(ev){ rn('winerr '+((ev&&ev.message)||'')); });
            rn('host '+location.host+location.pathname);
            var f=document.getElementById('portola');
            if(!f){ rn('NO iframe el'); return; }
            rn('iframe.src '+String(f.src||'').slice(0,46));
            f.addEventListener('load', function(){ rn('iframe LOAD ok'); });
            f.addEventListener('error', function(){ rn('iframe ERROR'); });
            setTimeout(function(){ var cw=false; try{ cw=!!f.contentWindow; }catch(e){} rn('after6s contentWindow='+cw); }, 6000);
          }catch(e){ }
        })(); true;`}
        // KYC needs the camera; grant inline media for the capture flow.
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback
        originWhitelist={['https://*']}
        // Safety net: the backend serves the embed same-origin so its
        // localStorage works natively in iOS WKWebView. If a frame's storage is
        // ever still blocked (SecurityError), fall back to an in-memory Storage
        // so the embed SPA doesn't crash to a blank screen. Runs in every frame
        // before the SPA.
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
        injectedJavaScriptBeforeContentLoaded={`(function(){
          try {
            var mem = {};
            var P = window.Storage && window.Storage.prototype;
            if (!P) return;
            var oS=P.setItem, oG=P.getItem, oR=P.removeItem, oC=P.clear, oK=P.key;
            P.setItem = function(k,v){ try{ return oS.call(this,k,v); }catch(e){ mem[k]=String(v); } };
            P.getItem = function(k){ try{ return oG.call(this,k); }catch(e){ return Object.prototype.hasOwnProperty.call(mem,k)?mem[k]:null; } };
            P.removeItem = function(k){ try{ return oR.call(this,k); }catch(e){ delete mem[k]; } };
            P.clear = function(){ try{ return oC.call(this); }catch(e){ mem={}; } };
            P.key = function(i){ try{ return oK.call(this,i); }catch(e){ return Object.keys(mem)[i]||null; } };
          } catch(e){}
        })(); true;`}
        style={{ flex: 1, backgroundColor: T.bg }}
      />

      {/* On-screen diagnostics overlay (temporary) — screenshot this if the
          embed shows blank/black so we can see what the WebView is doing. */}
      {debug.length > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          {debug.map((d, i) => (
            <Text
              key={i}
              style={{ color: '#7CFC00', fontSize: 10, lineHeight: 14 }}
            >
              {d}
            </Text>
          ))}
        </View>
      ) : null}
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
