import { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const authError = useAuthStore((s) => s.authError);
  const { canInstall, install, showInstallHint, platform } = usePWAInstall();

  async function handleGoogleSignIn() {
    setError(null);
    useAuthStore.getState().setAuthError(null);
    setIsSigningIn(true);

    const { error: signInError, redirect } = await signInWithGoogle();

    if (redirect) {
      return;
    }

    setIsSigningIn(false);
    if (signInError) {
      setError(signInError);
    }
  }

  async function handleInstall() {
    await install();
  }

  const displayError = error ?? authError;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "linear-gradient(180deg, var(--color-bg) 0%, #132a1e 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "var(--color-text)",
          }}
        >
          PrepMaster
        </h1>
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "2.5rem",
            lineHeight: 1.6,
          }}
        >
          Gerencie receitas, listas de compras e pré-preparos na palma da mão.
          IA para extrair receitas de vídeos e blogs.
        </p>

        {displayError && (
          <div
            role="alert"
            style={{
              padding: "1rem",
              marginBottom: "1.5rem",
              background: "rgba(244, 67, 54, 0.15)",
              borderRadius: "8px",
              color: "#ff8a80",
              fontSize: "0.95rem",
            }}
          >
            {displayError}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          style={{
            width: "100%",
            padding: "1rem 1.5rem",
            fontSize: "1.1rem",
            fontWeight: 600,
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "2px solid var(--color-accent)",
            borderRadius: "12px",
            cursor: isSigningIn ? "not-allowed" : "pointer",
            opacity: isSigningIn ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          <GoogleIcon />
          {isSigningIn ? "Entrando..." : "Entrar com Google"}
        </button>

        {canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.875rem 1.5rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              background: "transparent",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <InstallIcon />
            Instalar app
          </button>
        )}

        {showInstallHint && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              background: "rgba(26, 71, 42, 0.3)",
              borderRadius: "10px",
              fontSize: "0.9rem",
              color: "var(--color-muted)",
              textAlign: "left",
            }}
          >
            <strong style={{ color: "var(--color-accent)" }}>
              Como instalar:
            </strong>
            {platform === "ios" ? (
              <p style={{ margin: "0.5rem 0 0", lineHeight: 1.6 }}>
                Toque em <strong>Compartilhar</strong> (ícone ao lado da barra
                de endereço) → role e selecione{" "}
                <strong>Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <p style={{ margin: "0.5rem 0 0", lineHeight: 1.6 }}>
                Toque no menu <strong>⋮</strong> (três pontos) →{" "}
                <strong>Instalar app</strong> ou{" "}
                <strong>Adicionar à tela inicial</strong>.
              </p>
            )}
          </div>
        )}

        {!canInstall && !showInstallHint && (
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.85rem",
              color: "var(--color-muted)",
            }}
          >
            Instale como app para usar offline no supermercado.
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#fff"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#fff"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#fff"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#fff"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
