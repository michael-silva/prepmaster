import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { enableOfflinePersistence } from "./lib/firebase";
import "./index.css";

registerSW({
  onRegisterError: (err: unknown) =>
    console.error("SW registration failed:", err),
});
enableOfflinePersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
