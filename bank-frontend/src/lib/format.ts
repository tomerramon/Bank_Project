/**
 * Formatting Utilities
 */

import { format, formatDistanceToNow } from "date-fns";
import parsePhoneNumber, { type CountryCode } from "libphonenumber-js";

// ==========================================
// CURRENCY FORMATTING
// ==========================================
/**
 * Format currency amount
 * @param amount - Amount in dollars
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
	amount: number,
	options?: {
		showSign?: boolean;
		locale?: string;
		currency?: string;
	},
): string {
	const {
		showSign = false,
		locale = "en-US",
		currency = "USD",
	} = options || {};

	const formatted = new Intl.NumberFormat(locale, {
		currency,
		style: "currency",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Math.abs(amount));

	if (showSign && amount !== 0) {
		return amount >= 0 ? `+${formatted}` : `-${formatted}`;
	}

	return formatted;
}

/**
 * Format transaction amount with sign
 * @param amount - Amount in dollars
 * @param direction - Transaction direction
 * @returns Formatted amount with appropriate sign
 */
export function formatTransactionAmount(
	amount: number,
	direction: "T_IN" | "T_OUT",
): string {
	return formatCurrency(amount, { showSign: true }).replace(
		"+",
		direction === "T_IN" ? "+" : "-",
	);
}

// ==========================================
// DATE/TIME FORMATTING
// ==========================================
/**
 * Format date
 * @param date - Date string or Date object
 * @param dateFormat - Desired date format (default: 'MMM d, yyyy' -> 'Dec 25, 2023')
 * @returns Formatted date string
 */
export function formatDate(
	date: string | Date,
	dateFormat = "d mm yyyy", // alternative format -> dateFormat = "MMM d, yyyy",
): string {
	try {
		return format(new Date(date), dateFormat);
	} catch {
		return "Invalid date";
	}
}

/**
 * Format date-time
 * @param date - Date string or Date object
 * @returns Formatted date-time string (e.g. 'Dec 25, 2023, 3:30 PM')
 */
export function formatDateTime(date: string | Date): string {
	try {
		return format(new Date(date), "d mm yyyy, h:mm a");
		// return format(new Date(date), "MMM d, yyyy, h:mm a");
	} catch {
		return "Invalid date";
	}
}

/**
 * Format relative time
 * @param date - Date string or Date object
 * @returns Relative time string (e.g. '3 hours ago')
 */
export function formatRelativeTime(date: string | Date): string {
	try {
		return formatDistanceToNow(new Date(date), { addSuffix: true });
	} catch {
		return "Unknown time";
	}
}

// ==========================================
// PHONE NUMBER FORMATTING (INTERNATIONAL)
// ==========================================
/**
 * Format phone number for display (international)
 * @param phone - Phone number string
 * @param defaultCountry - Default country code
 * @returns Formatted phone number
 */
export function formatPhone(
	phone: string,
	defaultCountry?: CountryCode,
): string {
	try {
		const phoneNum = parsePhoneNumber(phone, defaultCountry);
		if (!phoneNum) {
			return phone;
		}
		return phoneNum.formatInternational();
	} catch {
		return phone;
	}
}

/**
 * Format phone number in national format (no country code)
 * @param phone - Phone number string
 * @param defaultCountry - Default country code
 * @returns Formatted phone number in national format
 *
 * Example:
 * - +1 (555) 123-4567 → (555) 123-4567
 * - +972 54-123-4567 → 054-123-4567
 */
export function formatPhoneNational(
	phone: string,
	defaultCountry?: CountryCode,
): string {
	try {
		const phoneNum = parsePhoneNumber(phone, defaultCountry);
		return phoneNum?.formatNational() || phone;
	} catch {
		return phone;
	}
}

/**
 * Validate phone number
 * @param phone - Phone number to validate
 * @param country - Expected country code (optional)
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(
	phone: string,
	country?: CountryCode,
): boolean {
	try {
		const phoneNum = parsePhoneNumber(phone, country);
		return phoneNum?.isValid() ?? false;
	} catch {
		return false;
	}
}

/**
 * Get phone number country code
 * @param phone - Phone number string
 * @returns Country code (e.g., 'US', 'IL', 'GB') or null
 */
export function getPhoneCountry(phone: string): string | null {
	try {
		const phoneNumber = parsePhoneNumber(phone);
		return phoneNumber?.country || null;
	} catch {
		return null;
	}
}

// ==========================================
// TEXT FORMATTING
// ==========================================
/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + "...";
}
/**
 * Capitalize first letter
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 * @param text - Text to convert
 * @returns Title cased text
 */
export function toTitleCase(text: string): string {
	return text
		.toLowerCase()
		.split(" ")
		.map((word) => capitalize(word))
		.join(" ");
}

// ==========================================
// MASKING (PRIVACY)
// ==========================================
/**
 * Mask email (show first 3 chars and domain)
 * @param email - Email to mask
 * @returns Masked email
 *
 * Example: user@example.com -> use****@example.com
 */
export function maskEmail(email: string): string {
	const [local, domain] = email.split("@");

	if (!domain) return email;
	if (local.length <= 3) return email;

	return `${local.slice(0, 3)}****@${domain}`;
}

/**
 * Mask phone number (show last 4 digits)
 * @param phone - Phone number to mask
 * @returns Masked phone number
 *
 * Example: +1234567890 -> ****7890
 */
export function maskPhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");

	if (digits.length <= 4) return phone;

	return "*".repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask credit card (show last 4 digits)
 * @param cardNumber - Card number to mask
 * @returns Masked card number
 *
 * Example: 1234567890123456 → **** **** **** 3456
 */
export function maskCardNumber(cardNumber: string): string {
	const digits = cardNumber.replace(/\D/g, "");
	if (digits.length <= 4) return cardNumber;

	const lastFour = digits.slice(-4);
	return `**** **** **** ${lastFour}`;
}
