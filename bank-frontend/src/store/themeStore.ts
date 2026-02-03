/**
 * Theme Store
 *
 * - Persisted to localStorage
 * - Applies .dark class to <html> element
 * - Respects system preference on first visit
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeStore } from "@/types";

export const useThemeStore = create<ThemeStore>()(
	persist(
		(set, get) => ({
			// Initial state
			theme: "dark",

			/**
			 * Toggle between light and dark theme
			 */
			toggleTheme: () => {
				const newTheme = get().theme === "light" ? "dark" : "light";
				set({ theme: newTheme });

				// Update document class for CSS
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(newTheme);
			},

			/**
			 * Set specific theme
			 */
			setTheme: (theme: "light" | "dark") => {
				set({ theme });

				// Update document class for CSS
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(theme);
			},
		}),
		{
			name: "theme-storage",
			onRehydrateStorage: () => (state) => {
				// Apply theme on initial load
				if (state?.theme) {
					document.documentElement.classList.add(state.theme);
				}
			},
		},
	),
);

/**
 * Initialize theme from system preference (first visit)
 * Call this in main.tsx
 */
export function initializeTheme() {
	const storedTheme = localStorage.getItem("theme-storage");

	// If no stored preference, use system preference
	if (!storedTheme) {
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		useThemeStore.getState().setTheme(prefersDark ? "dark" : "light");
	}
}
