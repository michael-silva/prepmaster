import {
  signInWithPopup,
  signOut as firebaseSignOut,
  type AuthError,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (err) {
    const authError = err as AuthError;
    const isOffline =
      authError.code === "auth/network-request-failed" ||
      !navigator.onLine;

    return {
      user: null,
      error: isOffline
        ? "Sem conexão com a internet. Conecte-se para fazer login."
        : authError.message ?? "Erro ao entrar. Tente novamente.",
    };
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}
