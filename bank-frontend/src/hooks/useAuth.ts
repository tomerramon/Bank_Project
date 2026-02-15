/**
 * Auth Hooks
 *
 * Centralized auth operations (login, signup, OTP, logout)
 * React 19 + Tailwind v4 pattern
 */

import { useMutation } from "@tanstack/react-query";
import * as authApi from "@api/auth.api";
import { getProfile } from "@api/users.api";
import { useAuthStore } from "@store/authStore";
import { getErrorMessage } from "@api/client.api";
import type {
	LoginFormData,
	SignupFormData,
	OTPFormData,
} from "@lib/validation";

// ==========================================
// LOGIN HOOK
// ==========================================

interface UseLoginOptions {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

/**
 * Login mutation
 *
 * Integrates with authStore to set token + user
 *
 * @param options - Success/error callbacks
 * @returns Mutation result with isPending, mutate, error
 *
 * @example
 * const login = useLogin({
 *   onSuccess: () => navigate('/dashboard'),
 *   onError: (err) => setError(err)
 * });
 *
 * <form onSubmit={handleSubmit((data) => login.mutate(data))}>
 *   {login.isPending && <Spinner />}
 * </form>
 */
export function useLogin(options?: UseLoginOptions) {
	const { setAuth } = useAuthStore();

	return useMutation({
		mutationFn: async (data: LoginFormData) => {
			const res = await authApi.login(data);
			return res.data.data;
		},

		onSuccess: (data) => {
			setAuth(data.user, data.token);

			options?.onSuccess?.();
		},

		onError: (error) => {
			const message = getErrorMessage(error);
			options?.onError?.(message);
		},
	});
}

// ==========================================
// SIGNUP HOOK
// ==========================================

interface UseSignupResult {
	userId: string;
	devOTP?: string;
}

interface UseSignupOptions {
	onSuccess?: (result: UseSignupResult) => void;
	onError?: (error: string) => void;
}

/**
 * Signup mutation
 *
 * Creates user account + sends OTP
 * Returns userId for OTP verification step
 *
 * @param options - Success/error callbacks
 * @returns Mutation result
 *
 * @example
 * const signup = useSignup({
 *   onSuccess: ({ userId }) => {
 *     navigate('/verify-otp', { state: { userId, email } });
 *   },
 *   onError: (err) => setError(err)
 * });
 *
 * signup.mutate({ email, password, phone });
 */
export function useSignup(options?: UseSignupOptions) {
	return useMutation({
		mutationFn: async (data: SignupFormData) => {
			const response = await authApi.signup(data);
			return response.data.data;
		},

		onSuccess: (data) => {
			options?.onSuccess?.(data);
		},

		onError: (error) => {
			const message = getErrorMessage(error);
			options?.onError?.(message);
		},
	});
}

// ==========================================
// VERIFY OTP HOOK
// ==========================================

interface UseVerifyOTPOptions {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

/**
 * Verify OTP mutation
 *
 * Verifies 6-digit code sent via email/SMS
 *
 * @param userId - User ID from signup response
 * @param options - Success/error callbacks
 * @returns Mutation result
 *
 * @example
 * const verifyOTP = useVerifyOTP(userId, {
 *   onSuccess: () => {
 *     toast.success('Account verified!');
 *     navigate('/login');
 *   },
 *   onError: (err) => setError(err)
 * });
 *
 * verifyOTP.mutate({ otp: '123456' });
 */
export function useVerifyOTP(userId: string, options?: UseVerifyOTPOptions) {
	return useMutation({
		mutationFn: async (data: OTPFormData) => {
			await authApi.verifyOTP(userId, data);
		},

		onSuccess: () => {
			options?.onSuccess?.();
		},

		onError: (error) => {
			const message = getErrorMessage(error);
			options?.onError?.(message);
		},
	});
}

// ==========================================
// RESEND OTP HOOK
// ==========================================

interface UseResendOTPOptions {
	onSuccess?: (devOTP?: string) => void;
	onError?: (error: string) => void;
}

/**
 * Resend OTP mutation
 *
 * Generates + sends new OTP code
 * Rate limited on backend (max 3 per 10 min)
 *
 * @param userId - User ID
 * @param options - Success/error callbacks
 * @returns Mutation result
 *
 * @example
 * const resendOTP = useResendOTP(userId, {
 *   onSuccess: (devOTP) => {
 *     console.log('Dev OTP:', devOTP);
 *     setSuccess('New code sent!');
 *   },
 *   onError: (err) => setError(err)
 * });
 *
 * <button onClick={() => resendOTP.mutate()}>
 *   Resend Code
 * </button>
 */
export function useResendOTP(userId: string, options?: UseResendOTPOptions) {
	return useMutation({
		mutationFn: async () => {
			const response = await authApi.resendOTP(userId);
			return response.data.data;
		},

		onSuccess: (data) => {
			options?.onSuccess?.(data?.devOTP);
		},

		onError: (error) => {
			const message = getErrorMessage(error);
			options?.onError?.(message);
		},
	});
}

// ==========================================
// LOGOUT HOOK
// ==========================================

interface UseLogoutOptions {
	onSuccess?: () => void;
	onError?: (error: string) => void;
}

/**
 * Logout mutation
 *
 * Clears token + user from store
 * Invalidates refresh token on backend
 *
 * @param options - Success/error callbacks
 * @returns Mutation result
 *
 * @example
 * const logout = useLogout({
 *   onSuccess: () => navigate('/login')
 * });
 *
 * <button onClick={() => logout.mutate()}>
 *   Logout
 * </button>
 */
export function useLogout(options?: UseLogoutOptions) {
	const { clearAuth } = useAuthStore(); // Get store setter only

	return useMutation({
		// Step 1: Call API to invalidate refresh token
		mutationFn: async () => {
			await authApi.logout();
		},

		onSettled: () => {
			clearAuth();
		},

		onSuccess: () => {
			// Callback
			options?.onSuccess?.();
		},

		onError: (error) => {
			const message = getErrorMessage(error);
			options?.onError?.(message);
		},
	});
}

// ==========================================
// REFRESH USER HOOK
// ==========================================

interface UseRefreshUserOptions {
	onError?: () => void;
}

/**
 * Refresh user data from backend
 *
 * Use case: After profile updates, refresh user in store
 *
 * @example
 * const refreshUser = useRefreshUser({
 *   onError: () => logout.mutate()
 * });
 *
 * // After profile update
 * await updateProfile.mutateAsync(data);
 * refreshUser.mutate();
 */
export function useRefreshUser(options?: UseRefreshUserOptions) {
	const { setUser, clearAuth } = useAuthStore();

	return useMutation({
		mutationFn: async () => {
			const { data } = await getProfile();
			return data.data;
		},

		onSuccess: (user) => {
			setUser(user);
		},

		onError: () => {
			// If refresh fails, user session likely invalid
			clearAuth();
			options?.onError?.();
		},
	});
}
