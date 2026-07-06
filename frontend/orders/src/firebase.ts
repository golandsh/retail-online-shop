import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-online-shop.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "online-shop-bf396",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "online-shop-bf396.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "demo-sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Check localStorage first, fallback to the env variable
const storedEmulatorSetting = localStorage.getItem('orders_use_emulator');
export const useEmulator = storedEmulatorSetting !== null
  ? storedEmulatorSetting === "true"
  : import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

if (useEmulator) {
  connectAuthEmulator(auth, "http://localhost:9099");
}

