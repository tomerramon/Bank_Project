/**
 * Login Page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { Card, CardContent } from "@/components/common/Card";
import { Logo } from "@/components/common/Logo";
import { useAuthStore } from "@/store/authStore";
import { loginFormSchema, type LoginFormData } from "@/lib/validation";

import bankBg from "@/assets/bank_bg.png";

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
		<div
			className="min-h-screen flex items-center justify-center px-4"
			style={{
				backgroundImage: `url(${bankBg})`, // Use the imported variable here
				backgroundSize: "cover", // Optional: Ensures the image covers the screen
				backgroundPosition: "center", // Optional: Centers the image
			}}
		>
			<div className="w-full max-w-md">
				{/* Card */}
				<Card className="p-8">
					{/* Logo */}
					<div className="flex justify-center mb-8">
						<Logo size="lg" />
					</div>
					<CardContent>
						<h1
							className="text-2xl font-bold text-center mb-6"
							style={{
								background:
									"linear-gradient(135deg, #00f0ff 0%, #4dd4ff 100%)",
								WebkitBackgroundClip: "text",
								WebkitTextFillColor: "transparent",
								backgroundClip: "text",
							}}
						>
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
							<p
								className="text-sm"
								style={{ color: "var(--color-text-secondary)" }}
							>
								Don't have an account?{" "}
								<Link
									to="/signup"
									className="font-medium"
									style={{ color: "var(--color-brand-500)" }}
								>
									Sign up
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
