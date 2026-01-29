/**
 * Main Entry Point
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/App.css";
import { initializeTheme } from "./store/themeStore";

// Initialize theme from system preference or localStorage
initializeTheme();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
