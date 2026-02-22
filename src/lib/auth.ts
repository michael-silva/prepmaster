import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
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

interface AuthErrorLike {
  code: string;
  message: string;
}

function isAuthError(err: unknown): err is AuthErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string"
  );
}

function getAuthErrorMessage(code: string, fallback: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? fallback;
}

interface SignInResult {
  user: User | null;
  error: string | null;
  redirect: boolean;
}

// Popup em todos os dispositivos: redirect quebra no iOS Safari
// por bloqueio de third-party cookies (authDomain cross-origin).
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null, redirect: false };
  } catch (err) {
    if (!isAuthError(err)) {
      return { user: null, error: "Erro ao entrar. Tente novamente.", redirect: false };
    }

    const isOffline = err.code === "auth/network-request-failed" || !navigator.onLine;

    // Se popup for bloqueado, tentar redirect como fallback.
    if (err.code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, error: null, redirect: true };
      } catch {
        // redirect falhou — retornar erro de popup
      }
    }

    return {
      user: null,
      error: isOffline
        ? getAuthErrorMessage("auth/network-request-failed", "Sem conexão.")
        : getAuthErrorMessage(err.code, err.message ?? "Erro ao entrar. Tente novamente."),
      redirect: false,
    };
  }
}

interface RedirectResult {
  user: User | null;
  error: string | null;
}

export async function handleRedirectResult(): Promise<RedirectResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return { user: result.user, error: null };
    }
    return null;
  } catch (err) {
    if (!isAuthError(err)) {
      return { user: null, error: "Erro ao concluir o login." };
    }
    return {
      user: null,
      error: getAuthErrorMessage(err.code, err.message ?? "Erro ao concluir o login."),
    };
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
