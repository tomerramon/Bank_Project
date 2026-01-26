/**
 * FormField Component
 *
 * Combines: Label + Input + Error + Helper Text
 */

import { type InputHTMLAttributes, type Ref, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@lib/cn";

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
	// Generate ID if not provided
	const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

	return (
		<div
			className={
				fullWidth ? "form-field-container-full" : "form-field-container"
			}
		>
			{label && (
				<label htmlFor={inputId} className="label">
					{label}
					{required && (
						<span className="error-text">*</span>
					)}
				</label>
			)}

			<div className="relative">
				{leftIcon && (
					<div className="form-field-left-icon">{leftIcon}</div>
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
					<AlertCircle className="form-field-error-icon" />
				) : (
					rightIcon && (
						<div className="form-field-right-icon">{rightIcon}</div>
					)
				)}
			</div>

			{error && (
				<p id={`${inputId}-error`} className="error-text" role="alert">
					{error}
				</p>
			)}

			{!error && helperText && (
				<p id={`${inputId}-helper`} className="form-field-helper-text">
					{helperText}
				</p>
			)}
		</div>
	);
}
