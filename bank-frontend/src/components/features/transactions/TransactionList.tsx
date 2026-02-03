/**
 * Transaction List Component
 */

import { TransactionItem } from "./TransactionItem";
import type { Transaction } from "@/types";

interface TransactionListProps {
	transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
	if (transactions.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500 dark:text-gray-400">
				No transactions yet
			</div>
		);
	}

	return (
		<div className="divide-y divide-gray-200 dark:divide-gray-800">
			{transactions.map((transaction) => (
				<TransactionItem
					key={transaction.id}
					transaction={transaction}
				/>
			))}
		</div>
	);
}
