/**
 * Public Route Component
 *
 * Redirects to /dashboard if already authenticated
 */

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

interface PublicRouteProps {
	children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
	const { isAuthenticated } = useAuthStore();

	// Redirect to dashboard if already authenticated
	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
