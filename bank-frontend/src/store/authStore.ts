/**
 * Authentication Store
 *
 * Zustand store with persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthStore, User } from "@/types";

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			isHydrated: false,

			/**
			 * Set authenticated user
			 * Called by login hook after successful API response
			 */
			setAuth: (user: User, token: string) => {
				set({ user, token, isAuthenticated: true });
			},

			/**
			 * Clear authentication
			 * Called by logout hook
			 */
			clearAuth: () => {
				set({ user: null, token: null, isAuthenticated: false });
			},

			/**
			 * Update user data
			 * Called by hooks after profile updates
			 */
			setUser: (user: User) => {
				set({ user });
			},
			
			setHydrated: (val: boolean) => {
				set({ isHydrated: val });
			},
		}),
		{
			name: "auth-storage",
			partialize: (state) => ({
				user: state.user,
				token: state.token,
				isAuthenticated: state.isAuthenticated,
			}),
			onRehydrateStorage: () => {
				return (state) => {
					state?.setHydrated(true);
				};
			},
		},
	),
);
