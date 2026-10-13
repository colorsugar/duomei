import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import "./styles.css";
import "./guyu.css";
import "./header-tablet-nav.css";
import "@fontsource-variable/fraunces";
import "./fonts.css";
import "./colorful.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
