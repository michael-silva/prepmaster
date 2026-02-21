import admin from "firebase-admin";


const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

function getApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
}

export function getAuth() {
  return getApp().auth();
}

export function getFirestore() {
  return admin.firestore();
}
