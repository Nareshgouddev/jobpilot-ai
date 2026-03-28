import React from "react";
import { createRoot } from "react-dom/client";

import "../../styles.css";
import { PopupApp } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Popup root element not found");
}

createRoot(container).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
