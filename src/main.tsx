import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./guyu.css";
import "./header-tablet-nav.css";
import "./experience/cinematic.css";
import "./experience/cinematic-film.css";
import "./experience/cinematic-shots.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import "./experience/cinematic-world.css";
