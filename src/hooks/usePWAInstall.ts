import { useState, useEffect } from "react";

function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [platform] = useState<"ios" | "android" | "desktop">(getPlatform);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsInstalled(standalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    }
    return outcome === "accepted";
  }

  // No iOS, beforeinstallprompt NUNCA dispara; no Android pode demorar (30s+).
  // Mostrar instruções manuais quando não instalado e não temos o prompt.
  const showInstallHint =
    !isInstalled &&
    (platform === "ios" || (platform === "android" && !deferredPrompt));

  return {
    canInstall: showInstallButton && !!deferredPrompt && !isInstalled,
    isInstalled,
    install,
    platform,
    showInstallHint,
  };
}
