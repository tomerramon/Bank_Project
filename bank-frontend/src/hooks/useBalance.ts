/**
 * Balance Hook
 *
 * Centralized balance queries with React Query
 */

import { useQuery } from "@tanstack/react-query";
import * as transactionsApi from "@/api/transactions.api";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Get user's current balance
 *
 * @returns Query result with balance data
 *
 * @example
 * const { data: balance, isLoading, error } = useBalance();
 * // balance = 1234.56
 */
export function useBalance() {
	return useQuery({
		queryKey: queryKeys.balance,
		queryFn: async () => {
			const res = await transactionsApi.getBalance();
			return res.data.data.balance;
		},
		staleTime: 30000, // 30 seconds - balance doesn't change that often
		gcTime: 5 * 60 * 1000, // 5 minutes caching
	});
}
