import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export async function enableOfflinePersistence() {
  try {
    await enableIndexedDbPersistence(db, {
      forceOwnership: false,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "failed-precondition") {
      console.warn(
        "Persistência offline: múltiplas abas abertas. Apenas uma terá persistência ativa."
      );
    } else if ((err as { code?: string }).code === "unimplemented") {
      console.warn("Persistência offline não suportada neste navegador.");
    }
  }
}
