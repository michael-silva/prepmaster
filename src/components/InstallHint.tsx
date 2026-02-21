import type { ReactNode } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface InstallHintProps {
  fallback?: ReactNode;
}

export function InstallHint({ fallback }: InstallHintProps) {
  const { canInstall, install, showInstallHint, platform } = usePWAInstall();

  if (canInstall) {
    return (
      <button
        type="button"
        onClick={() => install()}
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
    );
  }

  if (showInstallHint) {
    return (
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
        <strong style={{ color: "var(--color-accent)" }}>Como instalar:</strong>
        {platform === "ios" ? (
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            Toque em <strong>Compartilhar</strong> (ícone ao lado da barra de
            endereço) → role e selecione{" "}
            <strong>Adicionar à Tela de Início</strong>. Se não aparecer,
            abra este site no Safari.
          </p>
        ) : (
          <p style={{ margin: "0.5rem 0 0", lineHeight: 1.6 }}>
            Toque no menu <strong>⋮</strong> (três pontos) →{" "}
            <strong>Instalar app</strong> ou{" "}
            <strong>Adicionar à tela inicial</strong>. Se não aparecer, abra no
            Chrome.
          </p>
        )}
      </div>
    );
  }

  return fallback ?? null;
}

function InstallIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
