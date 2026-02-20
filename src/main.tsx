import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { enableOfflinePersistence } from "./lib/firebase";
import "./index.css";

enableOfflinePersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
