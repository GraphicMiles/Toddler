import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_Dummy_Key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "toddler.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "toddler",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "toddler.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "00000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000:web:000"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
