import { useState, useEffect, useRef } from "react";

function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return "ios";
  if (/iPad/.test(ua)) return "ios";
  if (
    /Macintosh/.test(ua) &&
    navigator.maxTouchPoints > 1 &&
    "ontouchend" in document
  ) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [platform] = useState<"ios" | "android" | "desktop">(getPlatform);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  promptRef.current = deferredPrompt;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      promptRef.current = ev;
      setDeferredPrompt(ev);
      setShowInstallButton(true);
    };

    const installedHandler = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
      promptRef.current = null;
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsInstalled(standalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  function install() {
    const prompt = promptRef.current ?? deferredPrompt;
    if (!prompt) return false;
    try {
      prompt.prompt();
      prompt.userChoice.then(({ outcome }) => {
        if (outcome === "accepted") {
          setShowInstallButton(false);
          setDeferredPrompt(null);
          promptRef.current = null;
        }
      });
      return true;
    } catch {
      return false;
    }
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
