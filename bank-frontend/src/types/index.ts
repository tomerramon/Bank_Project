/**
 * TypeScript Types
 *
 * Single source of truth for all application types
 * All application types matching backend API
 */

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

export interface ApiError {
	success: false;
	message: string;
	errors?: string[];
	details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

// ==========================================
// USER TYPES
// ==========================================

export interface User {
	id: string;
	email: string;
	phone: string;
	balance: number;
	balanceInDollars: number;
	isVerified: boolean;
	accountStatus: "active" | "suspended" | "closed";
	profile?: {
		firstName?: string;
		lastName?: string;
		dateOfBirth?: string;
		address?: {
			street?: string;
			city?: string;
			country?: string;
			zipCode?: string;
		};
	};
	notificationPreferences: {
		email: boolean;
		sms: boolean;
	};
	createdAt: string;
	recentTransactions?: Transaction[];
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface SignupResponse {
	userId: string;
	devOTP?: string;
}

// ==========================================
// TRANSACTION TYPES
// ==========================================

export interface Transaction {
	id: string;
	userId: string;
	peerUserId: {
		id: string;
		email: string;
	};
	amount: number;
	amountInDollars: number;
	formattedAmount: string;
	direction: "T_IN" | "T_OUT";
	reference: string;
	createdAt: string;
}

export interface TransferResponse {
	reference: string;
	amount: number;
	from: string;
	to: string;
	timestamp: string;
	senderBalance: number;
	senderTransaction: {
		id: string;
		direction: "T_OUT";
		amount: number;
	};
	receiverTransaction: {
		id: string;
		direction: "T_IN";
		amount: number;
	};
}

export interface TransactionStats {
	sent: {
		count: number;
		total: number;
	};
	received: {
		count: number;
		total: number;
	};
}

// ==========================================
// STORE TYPES
// ==========================================

/**
 * Auth Store State
 *
 * Used by Zustand store - defines state shape and actions
 */
export interface AuthStore {
	// State
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;

	// Actions (Pure state setters only - NO API calls)
	setAuth: (user: User, token: string) => void;
	clearAuth: () => void;
	setUser: (user: User) => void;
}

/**
 * Theme Store State
 */
export interface ThemeStore {
	theme: "light" | "dark";
	toggleTheme: () => void;
	setTheme: (theme: "light" | "dark") => void;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type RequestStatus = "idle" | "loading" | "success" | "error";

export interface FormError {
	field: string;
	message: string;
}
