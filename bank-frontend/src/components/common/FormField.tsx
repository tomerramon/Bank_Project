/**
 * FormField Component
 *
 * Combines: Label + Input + Error + Helper Text
 * React 19: ref as prop
 */

import { type InputHTMLAttributes, type Ref, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	fullWidth?: boolean;
	ref?: Ref<HTMLInputElement>;
}

export function FormField({
	label,
	error,
	helperText,
	leftIcon,
	rightIcon,
	className,
	fullWidth = true,
	required = false,
	id,
	ref,
	...props
}: FormFieldProps) {
	// Generate ID from label if not provided
	const inputId = id || label?.toLowerCase().replace(/\s+/g, "-") || "input";

	return (
		<div className={cn("mb-4", fullWidth && "w-full")}>
			{label && (
				<label htmlFor={inputId} className="label">
					{label}
					{required && <span className="text-red-600 ml-0.5">*</span>}
				</label>
			)}

			<div className="relative">
				{leftIcon && (
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
						{leftIcon}
					</div>
				)}

				<input
					ref={ref}
					id={inputId}
					className={cn(
						error ? "input-error" : "input",
						leftIcon && "pl-10",
						(rightIcon || error) && "pr-10",
						className,
					)}
					aria-invalid={error ? "true" : "false"}
					aria-describedby={
						error
							? `${inputId}-error`
							: helperText
								? `${inputId}-helper`
								: undefined
					}
					{...props}
				/>

				{error ? (
					<AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
				) : (
					rightIcon && (
						<div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
							{rightIcon}
						</div>
					)
				)}
			</div>

			{error && (
				<p id={`${inputId}-error`} className="error-text" role="alert">
					{error}
				</p>
			)}

			{!error && helperText && (
				<p
					id={`${inputId}-helper`}
					className="mt-1 text-xs text-gray-500 dark:text-gray-400"
				>
					{helperText}
				</p>
			)}
		</div>
	);
}
