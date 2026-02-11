/**
 * Error Boundary
 *
 * Catches unhandled errors in React component tree
 * Prevents entire app from crashing
 */

import React from "react";
import { Button } from "@/components/common/Button";
import { Card, CardContent } from "@/components/common/Card";

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		this.setState({
			error,
			errorInfo,
		});

		// TODO: Send to error reporting service (Sentry, LogRocket, etc.)
		// logErrorToService(error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback provided
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
					<Card className="max-w-2xl w-full">
						<CardContent className="p-8">
							<div className="text-center space-y-6">
								{/* Icon */}
								<div className="flex justify-center">
									<div className="h-16 w-16 rounded-full bg-error-bg flex items-center justify-center">
										<svg
											className="h-8 w-8 text-error"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
									</div>
								</div>

								{/* Title */}
								<div>
									<h1 className="text-2xl font-bold text-text-primary mb-2">
										Oops! Something went wrong
									</h1>
									<p className="text-text-secondary">
										We're sorry for the inconvenience. The
										application encountered an unexpected
										error.
									</p>
								</div>

								{/* Error Details (Development only) */}
								{import.meta.env.VITE_NODE_ENV ===
									"development" &&
									this.state.error && (
										<div className="mt-6 p-4 bg-surface-elevated rounded-lg text-left">
											<p className="text-sm font-semibold text-error mb-2">
												Error Details (Development
												Only):
											</p>
											<pre className="text-xs text-text-secondary overflow-auto max-h-40">
												{this.state.error.toString()}
												{
													this.state.errorInfo
														?.componentStack
												}
											</pre>
										</div>
									)}

								{/* Actions */}
								<div className="flex flex-col sm:flex-row gap-3 justify-center">
									<Button
										variant="primary"
										onClick={this.handleReset}
									>
										Try Again
									</Button>
									<Button
										variant="secondary"
										onClick={() =>
											(window.location.href = "/")
										}
									>
										Go to Home
									</Button>
									<Button
										variant="secondary"
										onClick={() => window.location.reload()}
									>
										Reload Page
									</Button>

									<Button
										variant="secondary"
										onClick={async () => {
											try {
												// Call logout API to invalidate refresh token
												await fetch(
													"/api/auth/logout",
													{
														method: "POST",
														credentials: "include", // Send cookies
													},
												);
											} catch (error) {
												console.error(
													"Logout API failed:",
													error,
												);
											} finally {
												// Always clear local state and redirect
												localStorage.removeItem(
													"accessToken",
												);
												localStorage.removeItem(
													"auth-storage",
												);
												window.location.href = "/login";
											}
										}}
									>
										Log Out
									</Button>
								</div>

								{/* Support Link */}
								<p className="text-sm text-text-tertiary mt-4">
									If the problem persists, please{" "}
									<a
										href="mailto:support@yourbank.com"
										className="text-primary hover:underline"
									>
										contact support
									</a>
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}
