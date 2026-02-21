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
        onClick={(e) => {
          e.preventDefault();
          install();
        }}
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
    const hint =
      platform === "ios"
        ? "Compartilhar → Adicionar à Tela de Início"
        : "Menu ⋮ → Instalar app ou Adicionar à tela inicial";

    // No Android, tentar install() ao tocar — deferredPrompt pode ter disparado depois
    const handleClick = platform === "android" ? () => install() : undefined;

    return (
      <div
        role={handleClick ? "button" : undefined}
        tabIndex={handleClick ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={
          handleClick
            ? (e) => e.key === "Enter" && handleClick()
            : undefined
        }
        style={{
          marginTop: "2rem",
          padding: "1rem 1.25rem",
          background: "rgba(26, 71, 42, 0.35)",
          borderRadius: "10px",
          border: "1px solid rgba(124, 184, 130, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          cursor: handleClick ? "pointer" : undefined,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: "10px",
            background: "rgba(124, 184, 130, 0.25)",
            color: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <InstallIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              color: "var(--color-text)",
              fontSize: "1rem",
            }}
          >
            Instalar app
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--color-muted)",
              marginTop: "0.25rem",
            }}
          >
            {hint}
          </div>
        </div>
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
