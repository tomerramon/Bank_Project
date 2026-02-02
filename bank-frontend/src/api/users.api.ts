/**
 * User API
 *
 * All user-related API calls
 */

import apiClient from "./client.api";
import type { ApiResponse, User } from "@/types";

/**
 * Get current user profile
 */
export async function getProfile() {
	return apiClient.get<ApiResponse<User>>("/users/me");
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
	"profile.firstName"?: string;
	"profile.lastName"?: string;
	"profile.address.city"?: string;
	"profile.address.country"?: string;
	"profile.address.zipCode"?: string;
}) {
	return apiClient.patch<ApiResponse<User>>("/users/me", data);
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(preferences: {
	email?: boolean;
	sms?: boolean;
}) {
	return apiClient.patch<ApiResponse<User>>(
		"/users/me/notifications",
		preferences,
	);
}
