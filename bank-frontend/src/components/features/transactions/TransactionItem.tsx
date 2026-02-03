/**
 * Transaction Item Component
 */

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Transaction } from "@/types";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

interface TransactionItemProps {
	transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
	const isIncoming = transaction.direction === "T_IN";
	const peerEmail = transaction.peerUserId.email;

	return (
		<div className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors px-4 -mx-4 rounded-lg">
			<div className="flex items-center gap-4">
				{/* Icon */}
				<div
					className={cn(
						"h-10 w-10 rounded-full flex items-center justify-center",
						isIncoming
							? "bg-green-100 dark:bg-green-900/20"
							: "bg-red-100 dark:bg-red-900/20",
					)}
				>
					{isIncoming ? (
						<ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
					) : (
						<ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
					)}
				</div>

				{/* Details */}
				<div>
					<p className="font-medium text-gray-900 dark:text-gray-100">
						{isIncoming ? "Received from" : "Sent to"} {peerEmail}
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{formatRelativeTime(transaction.createdAt)}
					</p>
				</div>
			</div>

			{/* Amount */}
			<div className="text-right">
				<p
					className={cn(
						"font-semibold text-lg",
						isIncoming
							? "text-green-600 dark:text-green-400"
							: "text-red-600 dark:text-red-400",
					)}
				>
					{isIncoming ? "+" : "-"}$
					{formatCurrency(transaction.amountInDollars)}
				</p>
			</div>
		</div>
	);
}
