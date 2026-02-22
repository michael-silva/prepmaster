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
        className="w-full mt-4 px-6 py-3.5 text-[0.95rem] font-medium bg-transparent text-accent border border-accent rounded-lg cursor-pointer flex items-center justify-center gap-2 hover:bg-accent/10 transition-colors"
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
        className={`mt-8 p-4 pr-5 bg-elevated/35 rounded-lg border border-accent/40 flex items-center gap-4 ${handleClick ? "cursor-pointer" : ""}`}
      >
        <div className="shrink-0 w-11 h-11 rounded-lg bg-accent/25 text-accent flex items-center justify-center">
          <InstallIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text text-base">
            Instalar app
          </div>
          <div className="text-sm text-muted mt-1">
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
