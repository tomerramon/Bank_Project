/**
 * Protected Route Component
 *
 * Redirects to /login if not authenticated
 */

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "@/components/common/Spinner";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isHydrated } = useAuthStore();

	// Show loading spinner while checking auth
	if (!isHydrated) {
		return <FullPageSpinner />;
	}

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
