import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { createClient } from "@/lib/supabase/client";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export function isIOSDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}

export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  const isStandaloneMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const isAppleStandalone = (window.navigator as any).standalone === true;
  return isStandaloneMedia || isAppleStandalone;
}

export function canUseWebPush(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Plays a subtle, pleasant notification chime using the Web Audio API.
 * Safe on iOS, Android, and desktop browsers without requiring external audio files.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 350);
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

export async function requestPushPermissionAndGetToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  try {
    // CRITICAL FOR iOS SAFARI: Request Notification permission synchronously inside the
    // user gesture BEFORE awaiting any other async promises (like isSupported()),
    // otherwise WebKit drops the transient user activation and ignores the prompt.
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission !== "granted") return null;

    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing");
      return null;
    }

    // Build service worker URL with Firebase config so background push works on iOS & Android
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      const swParams = new URLSearchParams({
        apiKey: firebaseConfig.apiKey || "",
        authDomain: firebaseConfig.authDomain || "",
        projectId: firebaseConfig.projectId || "",
        storageBucket: firebaseConfig.storageBucket || "",
        messagingSenderId: firebaseConfig.messagingSenderId || "",
        appId: firebaseConfig.appId || "",
      });
      swRegistration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${swParams.toString()}`,
        { scope: "/" }
      );
      await navigator.serviceWorker.ready;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("user_push_tokens").upsert(
          {
            user_id: user.id,
            token: token,
            device_type: isIOSDevice() ? "ios" : "web",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );
      }
      return token;
    }
  } catch (err) {
    console.error("Error getting push token:", err);
  }

  return null;
}

export async function syncPushTokenIfGranted(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    await requestPushPermissionAndGetToken();
  } catch {
    // Ignore background sync failures
  }
}

export async function disablePushNotifications(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_push_tokens").delete().eq("user_id", user.id);
      return true;
    }
  } catch (err) {
    console.error("Error disabling push token:", err);
  }

  return false;
}

export async function listenToForegroundPush(
  onMessageReceived: (payload: any) => void
): Promise<(() => void) | null> {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      onMessageReceived(payload);
    });
  } catch (err) {
    console.warn("Foreground push listener unavailable:", err);
    return null;
  }
}
