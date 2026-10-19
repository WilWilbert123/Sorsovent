import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

// Toggle USE_LOCAL_DEV to true to test local changes on emulator before deploying
const USE_LOCAL_DEV = true;
const TARGET_URL = USE_LOCAL_DEV
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001')
  : 'https://readytomingle.vercel.app/';

const WebViewComponent = WebView as unknown as React.ComponentType<any>;

export default function App() {
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const webViewRef = useRef<any>(null);

  // Android hardware back button handler
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent exiting the app
      }
      return false; // default Android exit
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage('');
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" />

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Connection Problem</Text>
            <Text style={styles.errorSubtitle}>
              {errorMessage || 'Unable to connect to Mingle. Please check your internet.'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
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
            bounces={false}
            overScrollMode="never"
            applicationNameForUserAgent="MingleApp/1.0"
            onNavigationStateChange={handleNavigationStateChange}
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent?.description && !nativeEvent.description.includes('net::ERR_ABORTED')) {
                setHasError(true);
                setErrorMessage(nativeEvent.description);
              }
            }}
            onHttpError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent;
              if (nativeEvent?.statusCode >= 500) {
                setHasError(true);
                setErrorMessage(`Server error (${nativeEvent.statusCode})`);
              }
            }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF3366',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    elevation: 2,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
