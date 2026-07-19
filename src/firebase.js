import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const keys = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
};

const firebaseConfig = Object.fromEntries(
  Object.entries(keys).map(([field, envKey]) => [field, import.meta.env[envKey]])
);
const missing = Object.entries(keys)
  .filter(([field]) => !firebaseConfig[field] || firebaseConfig[field].startsWith("your_"))
  .map(([, envKey]) => envKey);
if (missing.length) {
  throw new Error(`Missing Firebase configuration: ${missing.join(", ")}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
