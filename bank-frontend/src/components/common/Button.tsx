/**
 * Button  Component
 */

import type { ButtonHTMLAttributes, Ref } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@lib/cn";

const variantClasses = {
	primary: "btn-primary",
	secondary: "btn-secondary",
	ghost: "btn-ghost",
	danger: "btn-danger",
} as const;

const sizeClasses = {
	sm: "text-sm px-3 py-1.5",
	md: "text-sm px-4 py-2",
	lg: "text-base px-6 py-3",
};
type ButtonVariant = keyof typeof variantClasses;
type ButtonSize = keyof typeof sizeClasses;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	isLoading?: boolean;
	fullWidth?: boolean;
	ref?: Ref<HTMLButtonElement>;
}

export function Button({
	children,
	className,
	variant = "primary",
	size = "md",
	isLoading = false,
	fullWidth = false,
	disabled,
	ref,
	...props
}: ButtonProps) {
	return (
		<button
			ref={ref}
			disabled={disabled || isLoading}
			className={cn(
                "btn",
				variantClasses[variant],
				sizeClasses[size],
				fullWidth && "w-full",
				isLoading && "cursor-wait",
				className,
			)}
			{...props}
		>
			{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
			{children}
		</button>
	);
}
