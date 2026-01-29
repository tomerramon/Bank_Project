/**
 * Verify OTP Page
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { Logo } from "@/components/common/Logo";
import * as authApi from "@/api/auth.api";
import { otpFormSchema, type OTPFormData } from "@/lib/validation";
import { getErrorMessage } from "@/api/client.api";

export function VerifyOTPPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [resending, setResending] = useState(false);

	// Get userId from navigation state
	const { userId, email } =
		(location.state as { userId?: string; email?: string }) || {};

	useEffect(() => {
		if (!userId) {
			navigate("/signup");
		}
	}, [userId, navigate]);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<OTPFormData>({
		resolver: zodResolver(otpFormSchema),
	});

	const onSubmit = async (data: OTPFormData) => {
		if (!userId) return;

		try {
			setError(null);
			await authApi.verifyOTP(userId, data);
			setSuccess("Account verified! Redirecting to login...");

			setTimeout(() => {
				navigate("/login");
			}, 2000);
		} catch (err) {
			setError(getErrorMessage(err));
		}
	};

	const handleResendOTP = async () => {
		if (!userId) return;

		try {
			setResending(true);
			setError(null);
			await authApi.resendOTP(userId);
			setSuccess("New verification code sent!");

			setTimeout(() => setSuccess(null), 3000);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setResending(false);
		}
	};

	if (!userId) {
		return null;
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
			<div className="w-full max-w-md">
				<div className="flex justify-center mb-8">
					<Logo size="lg" />
				</div>

				<div className="card p-8">
					<h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
						Verify Your Account
					</h1>
					<p className="text-center text-gray-600 dark:text-gray-400 mb-6">
						We sent a 6-digit code to <strong>{email}</strong>
					</p>

					{error && (
						<Alert
							variant="error"
							className="mb-6"
							onDismiss={() => setError(null)}
						>
							{error}
						</Alert>
					)}

					{success && (
						<Alert variant="success" className="mb-6">
							{success}
						</Alert>
					)}

					<form
						onSubmit={handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							label="Verification Code"
							type="text"
							placeholder="123456"
							leftIcon={<KeyRound className="h-5 w-5" />}
							error={errors.otp?.message}
							maxLength={6}
							inputMode="numeric"
							pattern="[0-9]*"
							autoComplete="one-time-code"
							{...register("otp")}
						/>

						<Button
							type="submit"
							variant="primary"
							fullWidth
							isLoading={isSubmitting}
						>
							Verify Account
						</Button>
					</form>

					<div className="mt-6 text-center space-y-2">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Didn't receive the code?{" "}
							<button
								type="button"
								onClick={handleResendOTP}
								disabled={resending}
								className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 disabled:opacity-50"
							>
								{resending ? "Sending..." : "Resend"}
							</button>
						</p>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							<Link
								to="/login"
								className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
							>
								Back to login
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
