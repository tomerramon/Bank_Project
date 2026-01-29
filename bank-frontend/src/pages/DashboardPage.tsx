/**
 * Dashboard Page
 */

import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { BalanceCard } from "@/components/features/dashboard/BalanceCard";
import { RecentTransactions } from "@/components/features/dashboard/RecentTransactions";
import { TransferForm } from "@/components/features/transactions/TransferForm";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import { Spinner } from "@/components/common/Spinner";
import { Alert } from "@/components/common/Alert";
import * as transactionsApi from "@/api/transactions.api";
import { formatCurrency } from "@/lib/format";

export function DashboardPage() {
	// Fetch balance
	const { data: balanceData, isLoading: balanceLoading } = useQuery({
		queryKey: ["balance"],
		queryFn: () => transactionsApi.getBalance(),
	});

	// Fetch transaction stats
	const { data: statsData } = useQuery({
		queryKey: ["transaction-stats"],
		queryFn: () => transactionsApi.getTransactionStats(),
	});

	// Fetch recent transactions
	const {
		data: transactionsData,
		isLoading: transactionsLoading,
		error: transactionsError,
	} = useQuery({
		queryKey: ["recent-transactions"],
		queryFn: () => transactionsApi.getRecentTransactions(10),
	});

	const balance = balanceData?.data.data.balance || 0;
	const stats = statsData?.data.data;
	const transactions = transactionsData?.data.data || [];

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<Header />

			<main className="container-wide py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Left Column - Balance & Stats */}
					<div className="lg:col-span-2 space-y-6">
						{/* Balance Card */}
						<BalanceCard
							balance={balance}
							isLoading={balanceLoading}
						/>

						{/* Stats Cards */}
						{stats && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<Card className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
												Money Sent
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
												$
												{formatCurrency(
													stats.sent.total,
												)}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
												{stats.sent.count} transactions
											</p>
										</div>
										<div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
											<TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
										</div>
									</div>
								</Card>

								<Card className="p-6">
									<div className="flex items-center justify-between">
										<div>
											<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
												Money Received
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
												$
												{formatCurrency(
													stats.received.total,
												)}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
												{stats.received.count}{" "}
												transactions
											</p>
										</div>
										<div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
											<TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
										</div>
									</div>
								</Card>
							</div>
						)}

						{/* Recent Transactions */}
						<Card>
							<CardHeader>
								<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
									Recent Transactions
								</h2>
							</CardHeader>
							<CardContent>
								{transactionsLoading ? (
									<div className="flex justify-center py-8">
										<Spinner />
									</div>
								) : transactionsError ? (
									<Alert variant="error">
										Failed to load transactions
									</Alert>
								) : (
									<RecentTransactions
										transactions={transactions}
									/>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Transfer Form */}
					<div className="lg:col-span-1">
						<Card className="sticky top-6">
							<CardHeader>
								<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
									<DollarSign className="h-5 w-5" />
									Send Money
								</h2>
							</CardHeader>
							<CardContent>
								<TransferForm />
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
