/**
 * Balance Card Component
 */

import { Wallet } from "lucide-react";
import { Card } from "@/components/common/Card";
import { formatCurrency } from "@/lib/format";

interface BalanceCardProps {
	balance: number;
	isLoading?: boolean;
}

export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
	return (
		<Card className="p-6 bg-linear-to-br from-brand-500 to-brand-700">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-white/80 text-sm mb-2">Total Balance</p>
					{isLoading ? (
						<div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
					) : (
						<p className="text-white text-4xl font-bold tabular-nums">
							{formatCurrency(balance)}
						</p>
					)}
				</div>
				<div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
					<Wallet className="h-8 w-8 text-white" />
				</div>
			</div>
		</Card>
	);
}
