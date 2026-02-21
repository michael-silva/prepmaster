import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type AuthError,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/account-exists-with-different-credential":
    "Este e-mail já está cadastrado com outro método de login. Entre com e-mail e senha ou vincule sua conta Google nas configurações da sua conta.",
  "auth/popup-blocked":
    "O popup foi bloqueado. Use o botão novamente — vamos redirecioná-lo para o login.",
  "auth/network-request-failed":
    "Sem conexão com a internet. Conecte-se para fazer login.",
};

function getAuthErrorMessage(code: string, fallback: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? fallback;
}

export async function signInWithGoogle() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  try {
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, error: null, redirect: true };
    }

    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null, redirect: false };
  } catch (err) {
    const authError = err as AuthError;
    const isOffline =
      authError.code === "auth/network-request-failed" || !navigator.onLine;

    if (authError.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, error: null, redirect: true };
    }

    return {
      user: null,
      error: isOffline
        ? getAuthErrorMessage("auth/network-request-failed", "Sem conexão.")
        : getAuthErrorMessage(
            authError.code ?? "",
            authError.message ?? "Erro ao entrar. Tente novamente."
          ),
      redirect: false,
    };
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return { user: result.user, error: null };
    }
    return null;
  } catch (err) {
    const authError = err as AuthError;
    return {
      user: null,
      error: getAuthErrorMessage(
        authError.code ?? "",
        authError.message ?? "Erro ao concluir o login."
      ),
    };
  }
}

export async function signOut() {
  await firebaseSignOut(auth);
}
