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
  try {
    // Usar popup em todos os dispositivos: redirect quebra no iOS Safari
    // por bloqueio de third-party cookies (authDomain cross-origin).
    // Popup não depende de cookies third-party e geralmente funciona melhor.
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null, redirect: false };
  } catch (err) {
    const authError = err as AuthError;
    const isOffline =
      authError.code === "auth/network-request-failed" || !navigator.onLine;

    // Se popup for bloqueado (ex.: alguns navegadores mobile), tentar redirect.
    // Nota: redirect pode falhar no iOS Safari por third-party cookies.
    if (authError.code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null, redirect: true };
      } catch {
        // redirect falhou, retornar erro de popup
      }
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
