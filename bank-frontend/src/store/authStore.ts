/**
 * Authentication Store
 *
 * Zustand store with persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, User } from "@types";
import * as authApi from "@api/auth.api";
import * as userApi from "@api/users.api";
import { getErrorMessage } from "@api/client.api";

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			user: null,
			token: null,
			isAuthenticated: false,
			isLoading: false,

			/**
			 * Login user
			 */
			login: async (email: string, password: string) => {
				set({ isLoading: true });

				try {
					const { data } = await authApi.login({ email, password });
					const { token, user } = data.data;

					localStorage.setItem("accessToken", token);

					set({
						user: user as unknown as User,
						token,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({ isLoading: false });
					throw new Error(getErrorMessage(error));
				}
			},

			/**
			 * Logout user
			 */
			logout: async () => {
				try {
					await authApi.logout();
				} catch (error) {
					console.error("Logout API error:", error);
				} finally {
					localStorage.removeItem("accessToken");
					set({
						user: null,
						token: null,
						isAuthenticated: false,
					});
				}
			},

			/**
			 * Update user (after profile changes)
			 */
			setUser: (user: User) => {
				set({ user });
			},

			/**
			 * Refresh user data from backend
			 */
			refreshUser: async () => {
				try {
					const { data } = await userApi.getProfile();
					set({ user: data.data });
				} catch (error) {
					console.error("Failed to refresh user:", error);
					get().logout();
				}
			},
		}),
		{
			name: "auth-storage",
			partialize: (state) => ({
				user: state.user,
				token: state.token,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);
