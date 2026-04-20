import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

declare global {
  interface Window {
    ENV?: {
      VITE_FIREBASE_API_KEY?: string;
      VITE_FIREBASE_AUTH_DOMAIN?: string;
      VITE_FIREBASE_PROJECT_ID?: string;
      VITE_FIREBASE_STORAGE_BUCKET?: string;
      VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
      VITE_FIREBASE_APP_ID?: string;
    };
  }
}

// Firebase project configuration using environment variables
const isBrowser = typeof window !== 'undefined';

const firebaseConfig = {
  apiKey: (isBrowser ? window.ENV?.VITE_FIREBASE_API_KEY : process.env.VITE_FIREBASE_API_KEY) || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: (isBrowser ? window.ENV?.VITE_FIREBASE_AUTH_DOMAIN : process.env.VITE_FIREBASE_AUTH_DOMAIN) || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (isBrowser ? window.ENV?.VITE_FIREBASE_PROJECT_ID : process.env.VITE_FIREBASE_PROJECT_ID) || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (isBrowser ? window.ENV?.VITE_FIREBASE_STORAGE_BUCKET : process.env.VITE_FIREBASE_STORAGE_BUCKET) || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (isBrowser ? window.ENV?.VITE_FIREBASE_MESSAGING_SENDER_ID : process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (isBrowser ? window.ENV?.VITE_FIREBASE_APP_ID : process.env.VITE_FIREBASE_APP_ID) || import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
