/**
 * Transactions Page
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { TransactionList } from "@/components/features/transactions/TransactionList";
import { Card, CardHeader, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { Alert } from "@/components/common/Alert";
import * as transactionsApi from "@/api/transactions.api";

type FilterType = "all" | "T_IN" | "T_OUT";

export function TransactionsPage() {
	const [currentPage, setCurrentPage] = useState(1);
	const [filter, setFilter] = useState<FilterType>("all");

	const { data, isLoading, error } = useQuery({
		queryKey: ["transactions", currentPage, filter],
		queryFn: () =>
			transactionsApi.getTransactions({
				page: currentPage,
				limit: 20,
				direction: filter === "all" ? undefined : filter,
			}),
	});

	const transactions = data?.data.data || [];
	const pagination = data?.data.pagination;

	return (
		<div className="min-h-screen bg-surface-base">
			<Header />

			<main className="container-default py-8">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<h1 className="text-2xl font-bold text-text-primary">
								All Transactions
							</h1>

							{/* Filter Buttons */}
							<div className="flex items-center gap-2">
								<Filter className="h-5 w-5 text-text-tertiary" />
								<div className="flex gap-2">
									<Button
										size="sm"
										variant={
											filter === "all"
												? "primary"
												: "secondary"
										}
										onClick={() => setFilter("all")}
									>
										All
									</Button>
									<Button
										size="sm"
										variant={
											filter === "T_IN"
												? "primary"
												: "secondary"
										}
										onClick={() => setFilter("T_IN")}
									>
										Received
									</Button>
									<Button
										size="sm"
										variant={
											filter === "T_OUT"
												? "primary"
												: "secondary"
										}
										onClick={() => setFilter("T_OUT")}
									>
										Sent
									</Button>
								</div>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						{isLoading ? (
							<div className="flex justify-center py-12">
								<Spinner
									size="lg"
									text="Loading transactions..."
								/>
							</div>
						) : error ? (
							<Alert variant="error">
								Failed to load transactions. Please try again.
							</Alert>
						) : transactions.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-text-secondary">
									No transactions found
								</p>
							</div>
						) : (
							<>
								<TransactionList transactions={transactions} />

								{/* Pagination */}
								{pagination && pagination.totalPages > 1 && (
									<div
										className="flex items-center justify-between mt-6 pt-6"
										style={{
											borderTop:
												"1px solid var(--color-border-subtle)",
										}}
									>
										<p className="text-sm text-text-secondary">
											Page {pagination.page} of{" "}
											{pagination.totalPages}
										</p>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="secondary"
												disabled={
													!pagination.hasPreviousPage
												}
												onClick={() =>
													setCurrentPage((p) => p - 1)
												}
											>
												Previous
											</Button>
											<Button
												size="sm"
												variant="secondary"
												disabled={
													!pagination.hasNextPage
												}
												onClick={() =>
													setCurrentPage((p) => p + 1)
												}
											>
												Next
											</Button>
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
