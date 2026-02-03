/**
 * Query Key Factory
 *
 * Centralized query keys for React Query
 * Prevents typos and makes refactoring easier
 */

const TRANSACTION_KEY = ["transactions"] as const;

export const queryKeys = {
	// Auth
	auth: {
		user: ["auth", "user"] as const,
	},

	// Balance
	balance: ["balance"] as const,

	// Transactions
	transactions: {
		all: TRANSACTION_KEY,
		list: (filters?: {
			page?: number;
			limit?: number;
			direction?: "T_IN" | "T_OUT";
			startDate?: string;
			endDate?: string;
		}) => [...TRANSACTION_KEY, "list", filters] as const,

		recent: (limit?: number) =>
			[...TRANSACTION_KEY, "recent", limit] as const,

		byReference: (reference: string) =>
			[...TRANSACTION_KEY, "reference", reference] as const,
		stats: [...TRANSACTION_KEY, "stats"] as const,
	},
} as const;
