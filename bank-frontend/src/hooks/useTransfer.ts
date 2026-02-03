/**
 * Transfer Mutation Hook
 *
 * Centralized money transfer operation with automatic cache invalidation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as transactionsApi from "@/api/transactions.api";
import { queryKeys } from "@/lib/queryKeys";
import { getErrorMessage } from "@/api/client.api";
import type { TransferFormData } from "@/lib/validation";
import type { TransferResponse } from "@/types";

interface UseTransferOptions {
	onSuccess?: (data: TransferResponse) => void;
	onError?: (error: string) => void;
}

/**
 * Transfer money mutation
 * 
 * Automatically invalidates related queries on success:
 * - Balance
 * - Recent transactions
 * - Transaction list
 * - Transaction stats
 * 
 * @param options - Success/error callbacks
 * @returns Mutation result
 * 
 * @example
 * const transfer = useTransfer({
 *   onSuccess: (data) => {
 *     toast.success(`Sent $${data.amount} to ${data.to}`);
 *     reset();
 *   },
 *   onError: (err) => setError(err)
 * });
 * 
 * <form onSubmit={handleSubmit((data) => transfer.mutate(data))}>
 *   {transfer.isPending && <Spinner />}
 * </form>
 */
export function useTransfer(options?: UseTransferOptions) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: TransferFormData) => {
			const res = await transactionsApi.transferMoney(data);
			return res.data.data;
		},

		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.balance });
			queryClient.invalidateQueries({
				queryKey: queryKeys.transactions.all,
			});

			options?.onSuccess?.(data);
		},

		onError: (err) => {
			const msg = getErrorMessage(err);
			options?.onError?.(msg);
		},
	});
}
