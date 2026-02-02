/**
 * App Component - Main Router
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Layout Components
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PublicRoute } from "@/components/layout/PublicRoute";

// Pages
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { VerifyOTPPage } from "@/pages/VerifyOTPPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Create QueryClient
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false,
			staleTime: 30000, // 30 seconds
			gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
		},
		mutations: {
			retry: 0, // Don't retry mutations
		},
	},
});

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					{/* Redirect root to dashboard */}
					<Route
						path="/"
						element={<Navigate to="/dashboard" replace />}
					/>

					{/* Public Routes */}
					<Route
						path="/login"
						element={
							<PublicRoute>
								<LoginPage />
							</PublicRoute>
						}
					/>
					<Route
						path="/signup"
						element={
							<PublicRoute>
								<SignupPage />
							</PublicRoute>
						}
					/>
					<Route
						path="/verify-otp"
						element={
							<PublicRoute>
								<VerifyOTPPage />
							</PublicRoute>
						}
					/>

					{/* Protected Routes */}
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/transactions"
						element={
							<ProtectedRoute>
								<TransactionsPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/settings"
						element={
							<ProtectedRoute>
								<SettingsPage />
							</ProtectedRoute>
						}
					/>

					{/* 404 Fallback */}
					<Route
						path="*"
						element={<Navigate to="/dashboard" replace />}
					/>
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;
