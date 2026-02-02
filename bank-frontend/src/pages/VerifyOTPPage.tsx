/**
 * Verify OTP Page
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";

import { Button } from "@components/common/Button";
import { FormField } from "@components/common/FormField";
import { Alert } from "@components/common/Alert";
import { Card, CardContent } from "@components/common/Card";
import { Logo } from "@components/common/Logo";
import { otpFormSchema, type OTPFormData } from "@lib/validation";
import { useResendOTP, useVerifyOTP } from "@hooks/Useauth";

export function VerifyOTPPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

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
		formState: { errors },
	} = useForm<OTPFormData>({
		resolver: zodResolver(otpFormSchema),
	});

	const verifyOTPMutation = useVerifyOTP(userId || "", {
		onSuccess: () => {
			setSuccess("Account verified! Redirecting to login...");
			setTimeout(() => {
				navigate("/login");
			}, 2000);
		},

		onError: (err) => {
			setError(err);
		},
	});

	const resendOTPMutation = useResendOTP(userId || "", {
		onSuccess: () => {
			setSuccess("New verification code sent!");
			setTimeout(() => setSuccess(null), 3000);
		},
		onError: (err) => {
			setError(err);
		},
	});

	const onSubmit = async (data: OTPFormData) => {
		setError(null);
		verifyOTPMutation.mutate(data);
	};

	const handleResendOTP = async () => {
		setError(null);
		resendOTPMutation.mutate();
	};

	if (!userId) {
		return null;
	}

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
							Verify Your Account
						</h1>
						<p className="text-center mb-6 text-text-secondary">
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
								isLoading={verifyOTPMutation.isPending}
							>
								Verify Account
							</Button>
						</form>

						<div className="mt-6 text-center space-y-2">
							<p className="text-sm text-text-secondary">
								Didn't receive the code?{" "}
								<button
									type="button"
									onClick={handleResendOTP}
									disabled={resendOTPMutation.isPending}
									className="font-medium disabled:opacity-50 hover:underline text-neon-cyan"
								>
									{resendOTPMutation.isPending
										? "Sending..."
										: "Resend"}
								</button>
							</p>
							<p className="text-sm text-text-secondary">
								<Link
									to="/login"
									className="font-medium hover:underline text-neon-cyan"
								>
									Back to login
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
