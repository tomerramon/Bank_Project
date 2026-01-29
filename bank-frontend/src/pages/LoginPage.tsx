/**
 * Login Page
 *
 * Example of proper page structure with form handling
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { Logo } from "@/components/common/Logo";
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
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
			<div className="w-full max-w-lg">
				<div>
					{/* Logo */}
					<div className="flex justify-center mb-8">
						<Logo size="lg" />
					</div>

					{/* Card */}
					<div className="card p-8">
						<h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
							Welcome Back
						</h1>

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

						{/* Form */}
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="space-y-4"
						>
							<FormField
								label="Email"
								type="email"
								placeholder="you@example.com"
								leftIcon={<Mail className="h-5 w-5" />}
								error={errors.email?.message}
								{...register("email")}
							/>

							<FormField
								label="Password"
								type="password"
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.password?.message}
								{...register("password")}
							/>

							<Button
								type="submit"
								variant="primary"
								fullWidth
								isLoading={isSubmitting}
							>
								Sign In
							</Button>
						</form>

						{/* Footer Links */}
						<div className="mt-6 text-center space-y-2">
							<p className="text-sm text-gray-600 dark:text-gray-400">
								Don't have an account?{" "}
								<Link
									to="/signup"
									className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
								>
									Sign up
								</Link>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
