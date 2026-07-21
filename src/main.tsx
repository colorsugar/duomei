import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/syne";
import "@fontsource-variable/geist";
import App from "./App";
import "../tokens.css";
import "./styles.css";
import "./duomei-v3.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
