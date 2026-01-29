/**
 * Login Page - Night Vault Bank
 * Fixed version with proper Card component usage and branding
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Shield } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { Logo } from "@/components/common/Logo";
import { Card, CardContent } from "@/components/common/Card";
import { useAuthStore } from "@/store/authStore";
import { loginFormSchema, type LoginFormData } from "@/lib/validation";

export function LoginPage() {
	const navigate = useNavigate();
	const { login } = useAuthStore();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginFormSchema),
	});

	const onSubmit = async (data: LoginFormData) => {
		try {
			setError(null);
			await login(data.email, data.password);
			navigate("/dashboard");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		}
	};

	return (
		<div className="auth-layout">
			{/* Circuit Pattern Background */}
			<div className="circuit-pattern" />
			
			{/* Floating Particles Effect (Optional - can be added with JS) */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-brand-500 opacity-20 glow-pulse" />
				<div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-accent-500 opacity-30 glow-pulse" style={{ animationDelay: '1s' }} />
				<div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-brand-500 opacity-20 glow-pulse" style={{ animationDelay: '2s' }} />
			</div>

			<div className="w-full max-w-md z-10">
				{/* Logo */}
				<div className="flex justify-center mb-8 logo-container">
					<Logo size="lg" showText />
				</div>

				{/* Login Card */}
				<Card className="auth-layout-card holo-card">
					<CardContent>
						{/* Title */}
						<div className="text-center mb-6">
							<h1 className="text-3xl font-bold title-glow mb-2">
								Access Night Vault
							</h1>
							<p className="text-text-secondary text-sm">
								Secure banking in the digital realm
							</p>
						</div>

						{/* Error Alert */}
						{error && (
							<Alert
								variant="error"
								className="mb-6"
								onDismiss={() => setError(null)}
							>
								{error}
							</Alert>
						)}

						{/* Login Form */}
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								label="Email Address"
								type="email"
								placeholder="you@example.com"
								leftIcon={<Mail className="h-5 w-5" />}
								error={errors.email?.message}
								autoComplete="email"
								{...register("email")}
							/>

							<FormField
								label="Password"
								type="password"
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.password?.message}
								autoComplete="current-password"
								{...register("password")}
							/>

							<Button
								type="submit"
								variant="primary"
								fullWidth
								isLoading={isSubmitting}
								className="mt-6"
							>
								<Shield className="h-4 w-4" />
								Sign In Securely
							</Button>
						</form>

						{/* Security Badge */}
						<div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-tertiary">
							<Shield className="h-4 w-4 text-brand-500" />
							<span>256-bit encrypted connection</span>
						</div>

						{/* Footer Links */}
						<div className="mt-8 pt-6 border-t border-border-subtle text-center space-y-3">
							<p className="text-sm text-text-secondary">
								New to Night Vault?{" "}
								<Link
									to="/signup"
									className="font-medium text-brand-500 hover:text-brand-400 transition-colors"
								>
									Create Account
								</Link>
							</p>
							<p className="text-xs text-text-tertiary">
								Protected by enterprise-grade security
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Additional Info */}
				<p className="mt-6 text-center text-xs text-text-tertiary">
					© 2026 Night Vault Bank. Your secure digital fortress.
				</p>
			</div>
		</div>
	);
}