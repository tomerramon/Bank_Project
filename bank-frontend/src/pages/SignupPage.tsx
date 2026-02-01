/**
 * Signup Page
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Phone } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { Card, CardContent } from "@/components/common/Card";
import { Logo } from "@/components/common/Logo";
import * as authApi from "@/api/auth.api";
import { signupFormSchema, type SignupFormData } from "@/lib/validation";
import { getErrorMessage } from "@/api/client.api";

export function SignupPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupFormSchema),
	});

	const onSubmit = async (data: SignupFormData) => {
		try {
			setError(null);
			const response = await authApi.signup(data);
			const { userId } = response.data.data;

			// Navigate to OTP verification with userId
			navigate("/verify-otp", { state: { userId, email: data.email } });
		} catch (err) {
			setError(getErrorMessage(err));
		}
	};

	return (
		<div className="min-h-screen bg-bank-vault flex items-end justify-end px-12 sm:px-20 md:px-26 lg:px-40 pb-16 md:pb-24 lg:pb-32">
			{/* Overlay */}
			<div className="absolute inset-0 bg-overlay-gradient-left" />

			<div className="relative z-10 w-full max-w-md">
				<div className="flex justify-center mb-6">
					<Logo size="lg" showText={false} />
				</div>

				<Card className="card-cyberpunk p-8">
					<CardContent>
						<h1 className="text-2xl font-bold text-center mb-6 text-gradient-cyan uppercase">
							Create Account
						</h1>

						{error && (
							<Alert
								variant="error"
								className="mb-6"
								onDismiss={() => setError(null)}
							>
								{error}
							</Alert>
						)}

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
								required
								{...register("email")}
							/>

							<FormField
								label="Password"
								type="password"
								placeholder="••••••••"
								leftIcon={<Lock className="h-5 w-5" />}
								error={errors.password?.message}
								helperText="Min 8 chars with uppercase, lowercase, number & special char"
								required
								{...register("password")}
							/>

							<FormField
								label="Phone Number"
								type="tel"
								placeholder="+1234567890"
								leftIcon={<Phone className="h-5 w-5" />}
								error={errors.phone?.message}
								helperText="International format (e.g., +1234567890)"
								required
								{...register("phone")}
							/>

							<Button
								type="submit"
								variant="primary"
								fullWidth
								isLoading={isSubmitting}
							>
								Create Account
							</Button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-text-secondary">
								Already have an account?{" "}
								<Link
									to="/login"
									className="font-medium hover:underline text-neon-cyan"
								>
									Sign in
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
