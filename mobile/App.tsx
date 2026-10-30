import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  Animated,
  Easing,
  Linking,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

// Production URL for Mingle (Sorsovent)
const PRODUCTION_URL = 'https://readytomingle.vercel.app';

// Keep false to use https://readytomingle.vercel.app
const USE_LOCAL_DEV = false;
const TARGET_URL = USE_LOCAL_DEV
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000'
  : PRODUCTION_URL;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WebViewComponent = WebView as unknown as React.ComponentType<any>;

/**
 * Injected script for smooth native mobile feel & real-time network state bridge
 */
const INJECTED_NATIVE_BRIDGE_JS = `
  (function() {
    try {
      // Remove 300ms tap delay and gray tap highlight for a native app feel
      var style = document.createElement('style');
      style.innerHTML = '* { -webkit-tap-highlight-color: transparent; } html, body { overscroll-behavior-y: none; -webkit-font-smoothing: antialiased; }';
      document.head.appendChild(style);

      function notifyNetwork(status) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NETWORK_STATUS', status: status }));
        }
      }

      window.addEventListener('online', function() { notifyNetwork('online'); });
      window.addEventListener('offline', function() { notifyNetwork('offline'); });
      notifyNetwork(navigator.onLine ? 'online' : 'offline');
    } catch (e) {}
  })();
  true;
`;

/**
 * Reusable 60fps Native Shimmer Block
 */
function SkeletonBlock({
  pulseAnim,
  style,
}: {
  pulseAnim: Animated.Value;
  style?: any;
}) {
  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        style,
        {
          opacity: pulseAnim,
        },
      ]}
    />
  );
}

/**
 * Full-Screen Native Mingle Skeleton Loader (Matches Mingle Home Screen Layout)
 */
function MingleHomeSkeleton({
  fadeAnim,
  pulseAnim,
}: {
  fadeAnim: Animated.Value;
  pulseAnim: Animated.Value;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.skeletonOverlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {/* 1. Mobile Top Header Skeleton */}
      <View style={styles.skelHeader}>
        <View style={styles.skelHeaderLeft}>
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelLogoCircle} />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelBrandText} />
        </View>
        <View style={styles.skelHeaderRight}>
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelEventsPill} />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelIconCircle} />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelAvatarCircle} />
        </View>
      </View>

      <View style={styles.skelBody}>
        {/* 2. Sorsogon Community Greeting Card Skeleton */}
        <View style={styles.skelHeroCard}>
          <View style={styles.skelHeroTopRow}>
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={styles.skelHeroCommunityBadge}
            />
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={styles.skelHeroExploreBtn}
            />
          </View>
          <SkeletonBlock
            pulseAnim={pulseAnim}
            style={styles.skelHeroGreetingTitle}
          />
          <SkeletonBlock
            pulseAnim={pulseAnim}
            style={styles.skelHeroSubtitle}
          />
          <View style={styles.skelHeroPillsRow}>
            <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelQuickPill} />
            <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelQuickPill} />
            <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelQuickPill} />
          </View>
        </View>

        {/* 3. Featured Places in Sorsogon Carousel Skeleton */}
        <View style={styles.skelSectionCard}>
          <View style={styles.skelSectionHeader}>
            <View style={styles.skelHeaderLeft}>
              <SkeletonBlock
                pulseAnim={pulseAnim}
                style={styles.skelSmallSquare}
              />
              <View>
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 150, height: 12, borderRadius: 6, marginBottom: 5 }}
                />
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 190, height: 9, borderRadius: 5 }}
                />
              </View>
            </View>
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={{ width: 52, height: 12, borderRadius: 6 }}
            />
          </View>

          <View style={styles.skelPlacesRow}>
            <View style={styles.skelPlaceCard}>
              <SkeletonBlock
                pulseAnim={pulseAnim}
                style={{ width: 84, height: 14, borderRadius: 10 }}
              />
              <View>
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 90, height: 9, borderRadius: 4, marginBottom: 5 }}
                />
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 140, height: 13, borderRadius: 5, marginBottom: 4 }}
                />
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 165, height: 9, borderRadius: 4 }}
                />
              </View>
            </View>

            <View style={styles.skelPlaceCard}>
              <SkeletonBlock
                pulseAnim={pulseAnim}
                style={{ width: 84, height: 14, borderRadius: 10 }}
              />
              <View>
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 90, height: 9, borderRadius: 4, marginBottom: 5 }}
                />
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 140, height: 13, borderRadius: 5, marginBottom: 4 }}
                />
                <SkeletonBlock
                  pulseAnim={pulseAnim}
                  style={{ width: 165, height: 9, borderRadius: 4 }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 4. Create Post Composer Skeleton */}
        <View style={styles.skelComposerCard}>
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelAvatarCircle} />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelComposerInput} />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelIconCircle} />
        </View>

        {/* 5. Feed Filter Bar Skeleton */}
        <View style={styles.skelFilterBar}>
          <View style={styles.skelHeaderLeft}>
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={{ width: 72, height: 28, borderRadius: 10 }}
            />
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={{ width: 68, height: 28, borderRadius: 10 }}
            />
            <SkeletonBlock
              pulseAnim={pulseAnim}
              style={{ width: 64, height: 28, borderRadius: 10 }}
            />
          </View>
          <SkeletonBlock
            pulseAnim={pulseAnim}
            style={{ width: 28, height: 28, borderRadius: 10 }}
          />
        </View>

        {/* 6. Community Feed Post Card Skeleton */}
        <View style={styles.skelPostCard}>
          <View style={styles.skelPostHeader}>
            <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelAvatarCircle} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <SkeletonBlock
                pulseAnim={pulseAnim}
                style={{ width: 120, height: 12, borderRadius: 6, marginBottom: 6 }}
              />
              <SkeletonBlock
                pulseAnim={pulseAnim}
                style={{ width: 85, height: 9, borderRadius: 5 }}
              />
            </View>
          </View>
          <SkeletonBlock
            pulseAnim={pulseAnim}
            style={{ width: '92%', height: 11, borderRadius: 5, marginBottom: 7 }}
          />
          <SkeletonBlock
            pulseAnim={pulseAnim}
            style={{ width: '68%', height: 11, borderRadius: 5, marginBottom: 12 }}
          />
          <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelPostMedia} />
        </View>
      </View>

      {/* 7. Bottom Navigation Bar Skeleton */}
      <View style={styles.skelBottomNav}>
        <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelNavItem} />
        <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelNavItem} />
        <View style={styles.skelAddFab} />
        <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelNavItem} />
        <SkeletonBlock pulseAnim={pulseAnim} style={styles.skelNavItem} />
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [canGoBack, setCanGoBack] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Connection state for small dismissible offline/connecting banner
  const [connectionStatus, setConnectionStatus] = useState<
    'online' | 'offline' | 'connecting' | 'reconnected'
  >('online');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const webViewRef = useRef<any>(null);
  const skeletonFadeAnim = useRef(new Animated.Value(1)).current;
  const skeletonPulseAnim = useRef(new Animated.Value(0.45)).current;
  const wasOfflineRef = useRef(false);

  // Smooth 60fps pulse animation for the skeleton loader
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulseAnim, {
          toValue: 0.9,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulseAnim, {
          toValue: 0.42,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [skeletonPulseAnim]);

  const hideSkeletonSmoothly = useCallback(() => {
    setHasLoadedOnce(true);
    Animated.timing(skeletonFadeAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsInitialLoading(false);
    });
  }, [skeletonFadeAnim]);

  // Active connectivity probe
  const checkInternetConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    setBannerDismissed(false);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch(`${PRODUCTION_URL}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false;
          setConnectionStatus('reconnected');
          setTimeout(() => {
            setConnectionStatus('online');
          }, 2800);
        } else {
          setConnectionStatus('online');
        }
        if (hasError) {
          setHasError(false);
          setErrorMessage('');
          webViewRef.current?.reload();
        }
      } else {
        wasOfflineRef.current = true;
        setConnectionStatus('offline');
      }
    } catch {
      clearTimeout(timer);
      wasOfflineRef.current = true;
      setConnectionStatus('offline');
    }
  }, [hasError]);

  // Periodic connectivity check when offline
  useEffect(() => {
    checkInternetConnection();
    const interval = setInterval(() => {
      if (wasOfflineRef.current) {
        checkInternetConnection();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [checkInternetConnection]);

  // Android hardware back button handler
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
    },
    []
  );

  const handleWebViewMessage = useCallback(
    (event: any) => {
      try {
        const data = JSON.parse(event?.nativeEvent?.data || '{}');
        if (data.type === 'NETWORK_STATUS') {
          if (data.status === 'offline') {
            wasOfflineRef.current = true;
            setConnectionStatus('offline');
            setBannerDismissed(false);
          } else if (data.status === 'online') {
            checkInternetConnection();
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    },
    [checkInternetConnection]
  );

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage('');
    setIsInitialLoading(true);
    skeletonFadeAnim.setValue(1);
    checkInternetConnection();
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const showTopNetworkBanner =
    connectionStatus !== 'online' && !bannerDismissed;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />

        {/* Small, Clean, Dismissible Native Offline / Connecting Banner */}
        {showTopNetworkBanner && (
          <View
            style={[
              styles.networkBanner,
              connectionStatus === 'offline'
                ? styles.networkBannerOffline
                : connectionStatus === 'connecting'
                ? styles.networkBannerConnecting
                : styles.networkBannerOnline,
            ]}
          >
            <View style={styles.networkBannerLeft}>
              <View
                style={[
                  styles.networkDot,
                  connectionStatus === 'offline'
                    ? { backgroundColor: '#fbbf24' }
                    : connectionStatus === 'connecting'
                    ? { backgroundColor: '#38bdf8' }
                    : { backgroundColor: '#34d399' },
                ]}
              />
              <Text style={styles.networkBannerText} numberOfLines={1}>
                {connectionStatus === 'offline'
                  ? 'Offline mode • Showing saved feed & places'
                  : connectionStatus === 'connecting'
                  ? 'Connecting to Mingle...'
                  : 'Back online • Synced'}
              </Text>
            </View>

            <View style={styles.networkBannerActions}>
              {connectionStatus === 'offline' && (
                <TouchableOpacity
                  style={styles.bannerRetryBtn}
                  onPress={checkInternetConnection}
                  activeOpacity={0.75}
                >
                  <Text style={styles.bannerRetryText}>Retry</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.bannerCloseBtn}
                onPress={() => setBannerDismissed(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.bannerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Top Smooth Progress Indicator for Subsequent In-App Page Loads */}
        {hasLoadedOnce && loadProgress > 0 && loadProgress < 1 && (
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(loadProgress * 100)}%` },
              ]}
            />
          </View>
        )}

        <View style={styles.contentWrapper}>
          {hasError && !hasLoadedOnce ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorBadge}>
                <Text style={styles.errorBadgeText}>OFFLINE</Text>
              </View>
              <Text style={styles.errorTitle}>Unable to Reach Mingle</Text>
              <Text style={styles.errorSubtitle}>
                {errorMessage ||
                  'Please check your internet connection and try again.'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.85}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebViewComponent
              ref={webViewRef}
              source={{ uri: TARGET_URL }}
              style={styles.webview}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              geolocationEnabled={true}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              pullToRefreshEnabled={true}
              allowsBackForwardNavigationGestures={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              cacheEnabled={true}
              cacheMode={
                connectionStatus === 'offline'
                  ? 'LOAD_CACHE_ELSE_NETWORK'
                  : 'LOAD_DEFAULT'
              }
              androidLayerType="hardware"
              bounces={false}
              overScrollMode="never"
              injectedJavaScriptBeforeContentLoaded={INJECTED_NATIVE_BRIDGE_JS}
              userAgent={
                Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 MingleExpoApp/1.0'
                  : undefined
              }
              onNavigationStateChange={handleNavigationStateChange}
              onMessage={handleWebViewMessage}
              onShouldStartLoadWithRequest={(request: any) => {
                const url = request?.url || '';
                if (
                  url.startsWith('http://') ||
                  url.startsWith('https://') ||
                  url.startsWith('about:') ||
                  url.startsWith('blob:') ||
                  url.startsWith('data:')
                ) {
                  return true;
                }
                Linking.openURL(url).catch(() => {});
                return false;
              }}
              onLoadProgress={({ nativeEvent }: any) => {
                const p = nativeEvent?.progress ?? 0;
                setLoadProgress(p);
                if (p >= 0.85 && isInitialLoading) {
                  hideSkeletonSmoothly();
                }
              }}
              onLoadEnd={() => {
                setLoadProgress(1);
                if (isInitialLoading) {
                  hideSkeletonSmoothly();
                }
              }}
              onError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                const desc = nativeEvent?.description || '';
                if (desc && !desc.includes('net::ERR_ABORTED')) {
                  wasOfflineRef.current = true;
                  setConnectionStatus('offline');
                  setBannerDismissed(false);
                  if (!hasLoadedOnce) {
                    setHasError(true);
                    setErrorMessage(
                      'No internet connection detected. Connect to load Mingle for the first time.'
                    );
                    setIsInitialLoading(false);
                  }
                }
              }}
              onHttpError={(syntheticEvent: any) => {
                const { nativeEvent } = syntheticEvent;
                if (nativeEvent?.statusCode >= 502 && !hasLoadedOnce) {
                  setHasError(true);
                  setErrorMessage(
                    `Service temporarily unavailable (${nativeEvent.statusCode})`
                  );
                  setIsInitialLoading(false);
                }
              }}
            />
          )}

          {/* Smooth Animated Native Skeleton Loader Overlay */}
          {isInitialLoading && (
            <MingleHomeSkeleton
              fadeAnim={skeletonFadeAnim}
              pulseAnim={skeletonPulseAnim}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  /* ── Dismissible Offline / Connecting Banner ── */
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    zIndex: 50,
  },
  networkBannerOffline: {
    backgroundColor: '#451a03',
    borderBottomColor: 'rgba(245, 158, 11, 0.35)',
  },
  networkBannerConnecting: {
    backgroundColor: '#0f172a',
    borderBottomColor: 'rgba(56, 189, 248, 0.35)',
  },
  networkBannerOnline: {
    backgroundColor: '#064e3b',
    borderBottomColor: 'rgba(52, 211, 153, 0.35)',
  },
  networkBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
  },
  networkBannerText: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  networkBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerRetryBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  bannerRetryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerCloseBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  bannerCloseText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  /* ── Top Thin Progress Bar ── */
  progressBarTrack: {
    height: 2.5,
    width: '100%',
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    zIndex: 40,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF3366',
  },
  /* ── Native Skeleton Overlay ── */
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#f8fafc',
    zIndex: 30,
    justifyContent: 'space-between',
  },
  skeletonBase: {
    backgroundColor: '#e2e8f0',
  },
  skelHeader: {
    height: 56,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skelLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  skelBrandText: {
    width: 78,
    height: 16,
    borderRadius: 6,
  },
  skelEventsPill: {
    width: 68,
    height: 28,
    borderRadius: 12,
  },
  skelIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  skelAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  skelBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 12,
  },
  skelHeroCard: {
    backgroundColor: '#1e1b2e',
    borderRadius: 20,
    padding: 15,
    gap: 10,
  },
  skelHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skelHeroCommunityBadge: {
    width: 155,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  skelHeroExploreBtn: {
    width: 96,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  skelHeroGreetingTitle: {
    width: '72%',
    height: 20,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  skelHeroSubtitle: {
    width: '88%',
    height: 11,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  skelHeroPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  skelQuickPill: {
    width: 98,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  skelSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  skelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skelSmallSquare: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  skelPlacesRow: {
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
  },
  skelPlaceCard: {
    width: Math.min(220, SCREEN_WIDTH * 0.58),
    height: 128,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    padding: 10,
    justifyContent: 'space-between',
  },
  skelComposerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skelComposerInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
  },
  skelFilterBar: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skelPostCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  skelPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skelPostMedia: {
    width: '100%',
    height: 150,
    borderRadius: 14,
  },
  skelBottomNav: {
    height: 62,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  skelNavItem: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  skelAddFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF3366',
    marginTop: -18,
  },
  /* ── Offline Error View ── */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  errorBadge: {
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBadgeText: {
    color: '#FF3366',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF3366',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 24,
    elevation: 2,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
