/**
 * Authentication Store
 *
 * - Persisted to localStorage (survives page refresh)
 * - Handles login/logout
 * - Token management
 * - User state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiResponse, AuthState, LoginResponse, User } from "@/types";
import apiClient, { getErrorMessage } from "@/api/client.api";

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			//initail auth state
			user: null,
			token: null,
			isAuthenticated: false,
			isLoading: false,

			/**
			 * login user
			 */
			login: async (email: string, password: string) => {
				set({ isLoading: true });

				try {
					const { data } = await apiClient.post<
						ApiResponse<LoginResponse>
					>("/auth/login", { email, password });

					const { token, user } = data.data!;

					// Store token in local storage
					localStorage.setItem("accessToken", token);

					set({
						user: user as User,
						token: token,
						isAuthenticated: true,
						isLoading: false,
					});
				} catch (error) {
					set({ isLoading: false });
					throw new Error(getErrorMessage(error));
				}
			},

			/**
			 * Logout User
			 */
			logout: async () => {
				try {
					// Call backend logout (invalidates refresh token)
					await apiClient.post("/auth/logout");
				} catch (error) {
					// Continue logout even if API call fails
					console.error("Logout API error:", error);
				} finally {
					// Clear local state
					localStorage.removeItem("accessToken");
					set({
						user: null,
						token: null,
						isAuthenticated: false,
					});
				}
			},

			/**
			 * Update User (after profile changes)
			 */
			setUser: (user: User) => {
				set({ user });
			},

			/**
			 * Refresh User Data from Backend
			 */
			refreshUser: async () => {
				try {
					const { data } =
						await apiClient.get<ApiResponse<User>>("/users/me");
					set({ user: data.data! });
				} catch (error) {
					console.error("Failed to refresh user:", error);
					// If user fetch fails, might be invalid session
					get().logout();
				}
			},
		}),
		{
			name: "auth-storage", // localStorage key
			partialize: (state) => ({
				// Only persist user and token
				user: state.user,
				token: state.token,
				isAuthenticated: state.isAuthenticated,
			}),
		},
	),
);
