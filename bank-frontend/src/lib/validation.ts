import { z } from "zod";
import { isValidPhoneNumber } from "./format";

// ==========================================
// FIELD VALIDATORS
// ==========================================
/**
 * Email validator
 */
export const emailSchema = z
	.email("Invalid email format")
	.trim()
	.min(1, "Email is required")
	.max(255, "Email too long.");

/**
 * Password validator
 * - Min 8 chars
 * - At least 1 uppercase
 * - At least 1 lowercase
 * - At least 1 number
 * - At least 1 special char
 */
export const passwordSchema = z
	.string()
	.trim()
	.min(8, "Password must be at least 8 characters")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	.regex(/[0-9]/, "Password must contain at least one number")
	.regex(
		/[@$!%*?&]/,
		"Password must contain at least one special character (@$!%*?&)",
	);

/**
 * Phone validator (international)
 * Uses libphonenumber-js for validation
 */
export const phoneSchema = z
	.string()
	.trim()
	.min(1, "Phone number is required")
	.refine(
		(phone) => isValidPhoneNumber(phone),
		"Invalid phone number format",
	);

/**
 * OTP validator (6 digits)
 */
export const otpSchema = z
	.string()
	.trim()
	.length(6, "OTP must be exactly 6 digits")
	.regex(/^\d{6}$/, "OTP must contain only numbers");

/**
 * Amount validator (for transactions)
 */
export const amountSchema = z
	.number({ message: "Amount must be a number" })
	.positive("Amount must be greater than 0")
	.min(0.01, "Minimum amount is $0.01")
	.max(10000, "Maximum amount is $10,000")
	.refine((amount) => Number.isFinite(amount), "Invalid amount");

// ==========================================
// FORM SCHEMAS
// ==========================================
/**
 * Login form schema
 */
export const loginFormSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
	})
	.strict();

/**
 * Signup form schema
 */
export const signupFormSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		phone: phoneSchema,
	})
	.strict();

/**
 * OTP verification schema
 */
export const otpFormSchema = z
	.object({
		otp: otpSchema,
	})
	.strict();

/**
 * Helper function for amount cleaning
 */
const parseAmount = (val: unknown) => {
	if (typeof val === "string") {
		const cleaned = val.replace(/[^0-9.]/g, "");
		return cleaned ? Number(cleaned) : NaN;
	}
	return val;
};

/**
 * Transfer form schema
 */
export const transferFormSchema = z
	.object({
		toEmail: emailSchema,
		amount: z.any().transform(parseAmount).pipe(amountSchema),
	})
	.strict();

/**
 * Forgot password schema
 */
export const forgotPasswordFormSchema = z
	.object({
		email: emailSchema,
	})
	.strict();

/**
 * Reset password schema
 */
export const resetPasswordFormSchema = z
	.object({
		otp: otpSchema,
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	})
	.strict();

/**
 * Change password schema
 */
export const changePasswordFormSchema = z
	.object({
		oldPassword: z.string().min(1, "Current password is required"),
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	})
	.refine((data) => data.oldPassword !== data.newPassword, {
		message: "New password must be different from current password",
		path: ["newPassword"],
	})
	.strict();

// ==========================================
// TYPE EXPORTS
// ==========================================
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;
export type OTPFormData = z.infer<typeof otpFormSchema>;
export type TransferFormData = z.output<typeof transferFormSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
