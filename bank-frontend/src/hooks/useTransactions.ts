/**
 * Transactions Query Hooks
 * 
 * Centralized transaction data fetching with React Query
 */

import { useQuery } from "@tanstack/react-query";
import * as transactionsApi from "@/api/transactions.api";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Get paginated transactions with optional filters
 * 
 * @param params - Query parameters (page, limit, direction, dates)
 * @returns Query result with paginated transactions
 * 
 * @example
 * const { data, isLoading } = useTransactions({
 *   page: 1,
 *   limit: 20,
 *   direction: 'T_OUT'
 * });
 */
export function useTransactions(params?: {
  page?: number;
  limit?: number;
  direction?: "T_IN" | "T_OUT";
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: async () => {
      const res = await transactionsApi.getTransactions(params);
      return res.data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get recent transactions
 * 
 * @param limit - Number of transactions to fetch (default: 10)
 * @returns Query result with recent transactions
 * 
 * @example
 * const { data: transactions } = useRecentTransactions(10);
 */
export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: queryKeys.transactions.recent(limit),
    queryFn: async () => {
      const res = await transactionsApi.getRecentTransactions(limit);
      return res.data.data;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Get transaction by reference
 * 
 * @param reference - Transaction reference ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query result with transaction details
 * 
 * @example
 * const { data: transaction } = useTransactionByReference(reference);
 */
export function useTransactionByReference(
  reference: string,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.transactions.byReference(reference),
    queryFn: async () => {
      const res = await transactionsApi.getTransactionByReference(reference);
      return res.data.data;
    },
    enabled: enabled && !!reference,
    staleTime: 60_000, // 1 minute - individual transactions don't change
  });
}

/**
 * Get transaction statistics
 * 
 * @returns Query result with transaction stats (sent/received totals)
 * 
 * @example
 * const { data: stats } = useTransactionStats();
 * // stats = { sent: { count: 10, total: 1000 }, received: { count: 5, total: 500 } }
 */
export function useTransactionStats() {
  return useQuery({
    queryKey: queryKeys.transactions.stats,
    queryFn: async () => {
      const res = await transactionsApi.getTransactionStats();
      return res.data.data;
    },
    staleTime: 60_000, // 1 minute
  });
}