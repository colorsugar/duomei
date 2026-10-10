import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./guyu.css";
import "./header-tablet-nav.css";
import "@fontsource-variable/fraunces";
import "./fonts.css";
import "./colorful.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
