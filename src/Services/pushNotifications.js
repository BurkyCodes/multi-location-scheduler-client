import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const env = (...names) => names.map((name) => import.meta.env[name]).find(Boolean) || "";

const firebaseConfig = {
  apiKey: env("VITE_FIREBASE_API_KEY", "VITE_FIREBASE_WEB_API_KEY"),
  authDomain: env("VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_WEB_AUTH_DOMAIN"),
  projectId: env("VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_WEB_PROJECT_ID"),
  storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_WEB_STORAGE_BUCKET"),
  messagingSenderId: env(
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_MESSAGING_SENDERID",
    "VITE_FIREBASE_WEB_MESSAGING_SENDER_ID"
  ),
  appId: env("VITE_FIREBASE_APP_ID", "VITE_FIREBASE_WEB_APP_ID"),
};

const vapidKey = env(
  "VITE_FIREBASE_VAPID_KEY",
  "VITE_FIREBASE_WEB_PUSH_CERTIFICATE_KEY_PAIR"
);

const hasFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );

const getFirebaseApp = () => {
  if (!hasFirebaseConfig()) return null;
  return getApps()[0] || initializeApp(firebaseConfig);
};

export const getWebPushToken = async () => {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (!hasFirebaseConfig()) return null;
  if (!(await isSupported())) return null;

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return null;

  const app = getFirebaseApp();
  if (!app) return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  return await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
};

export const subscribeForegroundPush = async (handler) => {
  if (!hasFirebaseConfig()) return () => {};
  if (!(await isSupported())) return () => {};
  const app = getFirebaseApp();
  if (!app) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, handler);
};
