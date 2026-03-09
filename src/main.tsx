import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme immediately to prevent flash
try {
  const savedTheme = localStorage.getItem("app-theme");
  const validThemes = ["dark", "light", "steel", "emerald", "midnight"];
  if (savedTheme && validThemes.includes(savedTheme) && savedTheme !== "light") {
    document.documentElement.classList.add(savedTheme);
  }
} catch {
  // localStorage may be unavailable in private/incognito mode
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
