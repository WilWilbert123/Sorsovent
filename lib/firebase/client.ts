import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
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

export async function requestPushPermissionAndGetToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing");
      return null;
    }

    // Register service worker if available
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      // Store token in Supabase
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("user_push_tokens").upsert(
          {
            user_id: user.id,
            token: token,
            device_type: "web",
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

export async function disablePushNotifications(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_push_tokens").delete().eq("user_id", user.id);
      return true;
    }
  } catch (err) {
    console.error("Error disabling push token:", err);
  }

  return false;
}
