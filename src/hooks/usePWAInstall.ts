import { useState, useEffect, useCallback } from "react";

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

const PLATFORM = getPlatform();

// beforeinstallprompt fires once per page load — store it at module level
// so it survives React component mount/unmount cycles.
let savedPrompt: BeforeInstallPromptEvent | null = null;
let promptAvailable = false;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot() {
  return { promptAvailable, installed };
}

function initGlobalListeners() {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    savedPrompt = e as BeforeInstallPromptEvent;
    promptAvailable = true;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    savedPrompt = null;
    promptAvailable = false;
    installed = true;
    notify();
  });

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  if (standalone) {
    installed = true;
  }
}

initGlobalListeners();

export function usePWAInstall() {
  const [snapshotRef, setSnapshotRef] = useState(getSnapshot);

  useEffect(() => {
    const unsub = subscribe(() => setSnapshotRef(getSnapshot()));
    setSnapshotRef(getSnapshot());
    return unsub;
  }, []);

  const { promptAvailable: hasPrompt, installed: isInstalled } = snapshotRef;

  const install = useCallback(() => {
    if (!savedPrompt) return false;
    try {
      savedPrompt.prompt();
      savedPrompt.userChoice.then(({ outcome }) => {
        if (outcome === "accepted") {
          savedPrompt = null;
          promptAvailable = false;
          notify();
        }
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // No iOS, beforeinstallprompt NUNCA dispara; no Android pode demorar (30s+).
  const showInstallHint =
    !isInstalled &&
    (PLATFORM === "ios" || (PLATFORM === "android" && !hasPrompt));

  return {
    canInstall: hasPrompt && !isInstalled,
    isInstalled,
    install,
    platform: PLATFORM,
    showInstallHint,
  };
}
