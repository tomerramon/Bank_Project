/**
 * Transfer Form Component
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Mail, DollarSign } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import * as transactionsApi from "@/api/transactions.api";
import { transferFormSchema, type TransferFormData } from "@/lib/validation";
import { getErrorMessage } from "@/api/client.api";

export function TransferForm() {
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<TransferFormData>({
		resolver: zodResolver(transferFormSchema),
	});

	const onSubmit = async (data: TransferFormData) => {
		try {
			setError(null);
			setSuccess(null);

			await transactionsApi.transferMoney(data);

			setSuccess(
				`Successfully sent $${data.amount.toFixed(2)} to ${data.toEmail}`,
			);

			// Refresh queries
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({
				queryKey: ["recent-transactions"],
			});
			queryClient.invalidateQueries({ queryKey: ["transactions"] });
			queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });

			// Reset form
			reset();

			// Clear success message after 5 seconds
			setTimeout(() => setSuccess(null), 5000);
		} catch (err) {
			setError(getErrorMessage(err));
		}
	};

	return (
		<div className="space-y-4">
			{error && (
				<Alert variant="error" onDismiss={() => setError(null)}>
					{error}
				</Alert>
			)}

			{success && (
				<Alert variant="success" onDismiss={() => setSuccess(null)}>
					{success}
				</Alert>
			)}

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					label="Recipient Email"
					type="email"
					placeholder="recipient@example.com"
					leftIcon={<Mail className="h-5 w-5" />}
					error={errors.toEmail?.message}
					{...register("toEmail")}
				/>

				<FormField
					label="Amount"
					type="number"
					step="0.01"
					min="0.01"
					max="10000"
					placeholder="0.00"
					leftIcon={<DollarSign className="h-5 w-5" />}
					error={errors.amount?.message}
					{...register("amount", { valueAsNumber: true })}
				/>

				<Button
					type="submit"
					variant="primary"
					fullWidth
					isLoading={isSubmitting}
				>
					<Send className="h-4 w-4" />
					Send Money
				</Button>
			</form>
		</div>
	);
}
