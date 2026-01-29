/**
 * API Client
 *
 * Proper TypeScript generics, token refresh, error handling
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

// Type-safe API response wrapper
export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

export interface ApiError {
	success: false;
	message: string;
	errors?: string[];
	details?: Record<string, unknown>;
}

// Create axios instance
const apiClient = axios.create({
	baseURL: "/api",
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

// Request interceptor: Attach token
apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = localStorage.getItem("accessToken");

		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error) => Promise.reject(error),
);

// Response interceptor: Token refresh logic
let isRefreshing = false;
let failedQueue: Array<{
	resolve: (value: string | null) => void;
	reject: (reason: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});

	failedQueue = [];
};

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError<ApiError>) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & {
			_retry?: boolean;
		};

		// Handle 401 errors with token refresh
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						if (originalRequest.headers && token) {
							originalRequest.headers.Authorization = `Bearer ${token}`;
						}
						return apiClient(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const { data } = await axios.post<
					ApiResponse<{ token: string }>
				>("/api/auth/refresh", {}, { withCredentials: true });

				const newToken = data.data.token;
				localStorage.setItem("accessToken", newToken);

				if (originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}

				processQueue(null, newToken);
				return apiClient(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError as Error, null);

				// Logout user
				localStorage.removeItem("accessToken");
				window.location.href = "/login";

				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);

/**
 * Extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
	if (axios.isAxiosError(error)) {
		const apiError = error.response?.data as ApiError | undefined;

		if (apiError?.message) {
			return apiError.message;
		}

		if (apiError?.errors && Array.isArray(apiError.errors)) {
			return apiError.errors.join(", ");
		}

		return error.message || "An unexpected error occurred";
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "An unexpected error occurred";
}

/**
 * Type-safe GET request
 */
export async function get<T>(url: string) {
	return apiClient.get<ApiResponse<T>>(url);
}

/**
 * Type-safe POST request
 */
export async function post<T>(url: string, data?: unknown) {
	return apiClient.post<ApiResponse<T>>(url, data);
}

/**
 * Type-safe PATCH request
 */
export async function patch<T>(url: string, data?: unknown) {
	return apiClient.patch<ApiResponse<T>>(url, data);
}

/**
 * Type-safe DELETE request
 */
export async function del<T>(url: string) {
	return apiClient.delete<ApiResponse<T>>(url);
}

export default apiClient;
