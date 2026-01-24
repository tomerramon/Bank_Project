/**
 * Formatting Utilities
 */

import { format, formatDistanceToNow } from 'date-fns';
import parsePhoneNumber, { type CountryCode } from 'libphonenumber-js'

// ==========================================
// CURRENCY FORMATTING
// ==========================================
/**
 * @param amount - Amount in dollars
 * @param options - Formatting options
 * @returns 
 */
export function formatCurrency(
    amount: number,
    options?: {
        showSign?: boolean;
        locale?: string;
        currency?: string;
    }): string {
    const { showSign = false, locale = 'en-US', currency = 'USD' } = options || {};

    const formatted = new Intl.NumberFormat(
        locale,
        {
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.abs(amount));

    if (showSign && amount !== 0) {
        return 0 <= amount ? `+${formatted}` : `-${formatted}`;
    }

    return formatted;
}

/**
 * 
 * @param amount - Amount in dollars
 * @param direction - 'T_IN' | 'T_OUT'
 * @returns - Formatted amount with appropriate sign,
 */
export function formatTransactionAmount(amount: number, direction: 'T_IN' | 'T_OUT'): string {
    return formatCurrency(amount, { showSign: true, }).replace('+', direction === 'T_IN' ? '+' : '-');
}

// ==========================================
// DATE/TIME FORMATTING
// ==========================================
/**
 * @param date - Date string or Date object
 * @param dateFormat - Desired date format (default: 'd mm yyyy' -> '25 12 2023')
 * @returns - Formatted date string
 */
export function formatDate(date: string | Date, dateFormat = 'd mm yyyy'): string {
    try {
        return format(new Date(date), dateFormat);
    } catch {
        return 'Invalid date';
    }
}

/**
 * 
 * @param date - Date string or Date object
 * @returns - Formatted date-time string (e.g. '25 12 2023, 3:30 PM')
 */
export function formatDateTime(date: string | Date): string {
    return format(new Date(date), 'd mm yyyy, h:mm a');
}

/**
 * @param date - Date string or Date object
 * @returns - Relative time string (e.g. '3 hours ago')
*/
export function formatRelativeTime(date: string | Date): string {
    try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
        return 'Unknown time';
    }
}


// ==========================================
// PHONE NUMBER FORMATTING (INTERNATIONAL)
// ==========================================
/**
 * Format phone number for display (international)
 * @param phone - Phone number string
 * @returns - Formatted phone number (e.g. (123) 456-7890)
 */
export function formatPhone(phone: string, defaultCountry?: CountryCode): string {
    try {
        // Parse phone number
        const phoneNum = parsePhoneNumber(phone, defaultCountry);
        if (!phoneNum) {
            return phone;   // Return original if parsing fails
        }

        return phoneNum.formatInternational();  // Format in international format

    } catch {
        return phone;   // Return original if parsing fails
    }
}

/**
 * Format phone number in national format (no country code)
 * 
 * Example:
 * - +1 (555) 123-4567 → (555) 123-4567
 * - +972 54-123-4567 → 054-123-4567
 */
export function formatPhoneNational(phone: string, defaultCountry?: CountryCode): string {
    try {
        const phoneNum = parsePhoneNumber(phone, defaultCountry);
        return phoneNum?.formatNational() || phone;
    } catch {
        return phone;   // Return original if parsing fails
    }
}

/**W 
 * @param phone - Phone number to validate
 * @param country - Expected country code (optional)
 */
export function isValidPhoneNumber(phone: string, country?: CountryCode): boolean {
    try {
        const phoneNum = parsePhoneNumber(phone, country);
        return phoneNum?.isValid() ?? false;
    } catch {
        return false;
    }
}

/**
 * Get phone number country code
 * Returns country code (e.g., 'US', 'IL', 'GB') or null
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
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function toTitleCase(text: string): string {
    return text
        .toLowerCase()
        .split(' ')
        .map((word) => capitalize(word))
        .join(' ');
}


// ==========================================
// MASKING (PRIVACY)
// ==========================================
/**
 *  Mask email (show first 3 chars and domain)
 * Example: user@example.com -> use****@example.com
 */
export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');

    if (!domain) return email;

    if (local.length <= 3) return email;

    return `${local.slice(0, 3)}****@${domain}`;
}

/**
 * Mask phone number (show last 4 digits)
 * Example: +1234567890 -> ****7890
 */
export function maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    if (digits.length <= 4) return phone

    return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask credit card (show last 4 digits)
 * Example: 1234567890123456 → **** **** **** 3456
 */
export function maskCardNumber(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length <= 4) return cardNumber;

    const lastFour = digits.slice(-4);
    return `**** **** **** ${lastFour}`;
}