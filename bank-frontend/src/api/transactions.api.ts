/**
 * Transactions API
 *
 * All transaction-related API calls
 */

import apiClient from "./client.api";
import type {
	Transaction,
	TransferResponse,
	TransactionStats,
	PaginatedResponse,
	ApiResponse,
} from "@/types";
import type { TransferFormData } from "@/lib/validation";

/**
 * Transfer money
 */
export async function transferMoney(data: TransferFormData) {
	return apiClient.post<ApiResponse<TransferResponse>>(
		"/transactions/transfer",
		data,
	);
}

/**
 * Get transactions with pagination
 */
export async function getTransactions(params?: {
	page?: number;
	limit?: number;
	direction?: "T_IN" | "T_OUT";
	startDate?: string;
	endDate?: string;
}) {
	return apiClient.get<PaginatedResponse<Transaction>>("/transactions", {
		params,
	});
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit = 10) {
	return apiClient.get<ApiResponse<Transaction[]>>("/transactions/recent", {
		params: { limit },
	});
}

/**
 * Get transaction by reference
 */
export async function getTransactionByReference(reference: string) {
	return apiClient.get<ApiResponse<Transaction[]>>(
		`/transactions/${reference}`,
	);
}

/**
 * Get user balance
 */
export async function getBalance() {
	return apiClient.get<ApiResponse<{ balance: number }>>(
		"/transactions/balance",
	);
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats() {
	return apiClient.get<ApiResponse<TransactionStats>>("/transactions/stats");
}
