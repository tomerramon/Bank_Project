/**
 * API Client Configuration
 * 
 * - Base URL points to backend via Vite proxy
 * - Automatic token attachment
 * - Automatic token refresh on 401
 * - Centralized error handling
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';


// Create axios instance
const apiClient = axios.create({
    baseURL: '/api', // Vite proxy forwards to localhost:5000
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Send cookies (for refresh token)
});

/**
 * Request Interceptor: Attach Access Token
 */
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);


/**
 * Response Interceptor: Handle Token Refresh
 */
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
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
    (response) => response, async (error: AxiosError<{ message: string }>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; };

        // If 401 and not already retrying, attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint
                const { data } = await axios.post<{ data: { token: string } }>(
                    '/api/auth/refresh',
                    {},
                    { withCredentials: true }
                );

                const newToken = data.data.token;
                localStorage.setItem('accessToken', newToken);

                // Update Authorization header
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }

                processQueue(null, newToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);

                // Refresh failed - logout user
                localStorage.removeItem('accessToken');
                window.location.href = '/login';

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Helper: Extract error message from response
 */
export const getErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message || error.message || 'An unknown error occurred';
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred';

};

export default apiClient;