import { config } from "dotenv";
import path from "path";

// Carrega .env.local localmente (vercel dev usa variáveis do dashboard por padrão)
config({ path: path.resolve(process.cwd(), ".env.local") });

import admin from "firebase-admin";

function getApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local (or Vercel env vars)."
    );
  }

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY inválido. Use a chave do JSON da conta de serviço (Firebase Console → Configurações → Contas de serviço → Gerar nova chave). Não use a API Key (VITE_FIREBASE_API_KEY)."
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAuth() {
  return getApp().auth();
}

export function getFirestore() {
  getApp();
  return admin.firestore();
}
