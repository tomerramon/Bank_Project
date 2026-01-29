/**
 * Auth API
 *
 * All authentication-related API calls
 */

import apiClient, { type ApiResponse } from "./client.api";
import type {
	LoginFormData,
	SignupFormData,
	OTPFormData,
} from "@/lib/validation";

export interface LoginResponse {
	token: string;
	user: {
		id: string;
		email: string;
		balance: number;
		isVerified: boolean;
		accountStatus: string;
	};
}

export interface SignupResponse {
	userId: string;
	devOTP?: string;
}

/**
 * Login user
 */
export async function login(data: LoginFormData) {
	return apiClient.post<ApiResponse<LoginResponse>>("/auth/login", data);
}

/**
 * Signup new user
 */
export async function signup(data: SignupFormData) {
	console.log(data);
	return apiClient.post<ApiResponse<SignupResponse>>("/auth/signup", data);
}

/**
 * Verify OTP
 */
export async function verifyOTP(userId: string, data: OTPFormData) {
	return apiClient.post<ApiResponse<null>>("/auth/verify-otp", {
		userId,
		...data,
		type: "EMAIL_VERIFICATION",
	});
}

/**
 * Resend OTP
 */
export async function resendOTP(userId: string) {
	return apiClient.post<ApiResponse<{ devOTP?: string }>>(
		"/auth/resend-otp",
		{
			userId,
			type: "EMAIL_VERIFICATION",
		},
	);
}

/**
 * Logout user
 */
export async function logout() {
	return apiClient.post<ApiResponse<null>>("/auth/logout");
}

/**
 * Refresh token
 */
export async function refreshToken() {
	return apiClient.post<ApiResponse<{ token: string }>>("/auth/refresh");
}

/**
 * Change password
 */
export async function changePassword(oldPassword: string, newPassword: string) {
	return apiClient.post<ApiResponse<null>>("/auth/change-password", {
		oldPassword,
		newPassword,
	});
}
