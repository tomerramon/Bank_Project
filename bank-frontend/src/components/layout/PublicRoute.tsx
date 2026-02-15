/**
 * Public Route Component
 *
 * Redirects to /dashboard if already authenticated
 */

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { FullPageSpinner } from "../common";

interface PublicRouteProps {
	children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
	const { isAuthenticated, isHydrated } = useAuthStore();

	// Show loading spinner while checking auth
	if (!isHydrated) {
		return <FullPageSpinner />;
	}
	
	// Redirect to dashboard if already authenticated
	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
