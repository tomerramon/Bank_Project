/**
 * Transfer Form Component
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Mail, DollarSign } from "lucide-react";

import { Button } from "@/components/common/Button";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/common/Alert";
import { transferFormSchema, type TransferFormData } from "@/lib/validation";
import { useTransfer } from "@/hooks/useTransfer";

export function TransferForm() {
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<TransferFormData>({
		resolver: zodResolver(transferFormSchema),
	});

	const transferMutation = useTransfer({
		onSuccess: (data) => {
			setSuccess(
				`Successfully sent $${data.amount.toFixed(2)} to ${data.to}`,
			);
			reset();
			// Clear success message after 5 seconds
			setTimeout(() => setSuccess(null), 5000);
		},
		onError: (err) => {
			setError(err);
		},
	});

	const onSubmit = async (data: TransferFormData) => {
		setError(null);
		setSuccess(null);

		transferMutation.mutate(data);
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
					isLoading={transferMutation.isPending}
				>
					<Send className="h-4 w-4" />
					Send Money
				</Button>
			</form>
		</div>
	);
}
