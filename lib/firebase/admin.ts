import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function sanitizePrivateKey(rawKey: string | undefined): string | null {
  if (!rawKey) return null;
  let key = rawKey.trim();

  // Strip wrapping quotes or escaped quotes often added in env variables
  if (key.startsWith('\\"') && key.endsWith('\\"')) {
    key = key.slice(2, -2).trim();
  }
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Replace literal '\n' sequences with real newlines and remove carriage returns
  key = key.replace(/\\n/g, "\n").replace(/\r/g, "");

  // Verify that it contains valid PEM private key headers
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    return null;
  }

  return key;
}

export function getAdminMessaging(): Messaging | null {
  try {
    let app: App;
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
      const privateKey = sanitizePrivateKey(rawPrivateKey);

      if (!projectId || !clientEmail || !privateKey) {
        return null;
      }

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      app = getApps()[0];
    }

    return getMessaging(app);
  } catch (error: any) {
    console.warn("[Firebase Admin] Push notifications disabled or invalid credentials:", error?.message || error);
    return null;
  }
}

let initialMessaging: Messaging | null = null;
try {
  initialMessaging = getAdminMessaging();
} catch {
  initialMessaging = null;
}

export const adminMessaging = initialMessaging;

