/**
 * Theme Store
 * 
 * - Persisted to localStorage
 * - Applies .dark class to <html> element
 * - Respects system preference on first visit
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeState } from '@/types';


export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            // Initial theme (will be overridden by persist middleware)
            theme: 'light',

            /**
             * Toggle between light and dark
             */
            toggleTheme: () => {
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';

                    // Apply to DOM
                    if (newTheme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }

                    return { theme: newTheme };
                });
            },

            /**
             * Set specific theme
             */
            setTheme: (theme: 'light' | 'dark') => {
                // Apply to DOM
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                set({ theme });
            },
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => (state) => {
                // Apply theme on page load
                if (state) {
                    if (state.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            },
        }
    )
);

/**
 * Initialize theme from system preference (first visit)
 * Call this in main.tsx
 */
export function initializeTheme() {
    const storedTheme = localStorage.getItem('theme-storage');

    // If no stored preference, use system preference
    if (!storedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        useThemeStore.getState().setTheme(prefersDark ? 'dark' : 'light');
    }
}