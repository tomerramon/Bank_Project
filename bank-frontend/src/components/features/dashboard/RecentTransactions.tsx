/**
 * Recent Transactions Component
 */

import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TransactionItem } from "@/components/features/transactions/TransactionItem";
import type { Transaction } from "@/types";

interface RecentTransactionsProps {
	transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
	if (transactions.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500 dark:text-gray-400">
				<p>No transactions yet</p>
				<p className="text-sm mt-2">Send money to get started!</p>
			</div>
		);
	}

	return (
		<div>
			<div className="divide-y divide-gray-200 dark:divide-gray-800">
				{transactions.slice(0, 5).map((transaction) => (
					<TransactionItem
						key={transaction.id}
						transaction={transaction}
					/>
				))}
			</div>

			{transactions.length > 5 && (
				<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
					<Link
						to="/transactions"
						className="flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium text-sm transition-colors"
					>
						View all transactions
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>
			)}
		</div>
	);
}
