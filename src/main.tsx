import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root")!;
// 빌드 때 미리 그린 홈 HTML 이 다른 경로에 딸려 왔으면 비우고 그린다(scripts/prerender.mjs).
if (document.documentElement.classList.contains("spa-wait")) {
  root.innerHTML = "";
  document.documentElement.classList.remove("spa-wait");
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
