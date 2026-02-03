/**
 * Login Page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock } from "lucide-react";

import { Button } from "@components/common/Button";
import { FormField } from "@components/common/FormField";
import { Alert } from "@components/common/Alert";
import { Card, CardContent } from "@components/common/Card";
import { Logo } from "@components/common/Logo";
import { loginFormSchema, type LoginFormData } from "@lib/validation";
import { useLogin } from "@/hooks/useAuth";

export function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginFormSchema),
	});

	const loginMutation = useLogin({
		onSuccess: () => {
			navigate("/dashboard");
		},
		onError: (err) => {
			setError(err);
			setTimeout(() => setError(null), 5000);
		},
	});

	const onSubmit = async (data: LoginFormData) => {
		setError(null);
		loginMutation.mutate(data);
	};

	return (
		<div className="min-h-screen bg-bank-vault flex items-end justify-end px-12 sm:px-20 md:px-26 lg:px-40 pb-16 md:pb-24 lg:pb-32">
			{/* Overlay for better readability */}
			<div className="absolute inset-0 bg-overlay-gradient-left" />

			{/* Content Container */}
			<div className="relative z-10 w-full max-w-md">
				{/* Logo */}
				<div className="flex justify-center mb-6">
					<Logo size="lg" showText={false} />
				</div>

				{/* Card */}
				<Card className="card-cyberpunk p-8">
					<CardContent>
						<h1 className="text-2xl font-bold text-center mb-6 text-gradient-cyan uppercase">
							ACCESS NIGHT VAULT
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
								isLoading={loginMutation.isPending}
							>
								Sign In
							</Button>
						</form>

						{/* Footer Links */}
						<div className="mt-6 text-center space-y-2">
							<p className="text-sm text-text-secondary">
								Don't have an account?{" "}
								<Link
									to="/signup"
									className="font-medium hover:underline text-neon-cyan"
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
