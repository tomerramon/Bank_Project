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
import bankBg from "@/assets/bank_bg.png";

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
		<div
			className="min-h-screen flex items-center justify-center px-4"
			style={{
				backgroundImage: `url(${bankBg})`, // Use the imported variable here
				backgroundSize: "cover", // Optional: Ensures the image covers the screen
				backgroundPosition: "center", // Optional: Centers the image
			}}
		>
			<div className="w-full max-w-md">
				{/* <div className="flex justify-center mb-8">
					<Logo size="lg" />
				</div> */}

				<Card className="p-8">
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
								helperText="At least 8 characters with uppercase, lowercase, number, and special character"
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
							<p
								className="text-sm"
								style={{ color: "var(--color-text-secondary)" }}
							>
								Already have an account?{" "}
								<Link
									to="/login"
									className="font-medium"
									style={{ color: "var(--color-brand-500)" }}
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
