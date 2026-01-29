/**
 * Button Component
 *
 * React 19 pattern: ref as prop (no forwardRef)
 * Proper TypeScript generics and variants
 */

import { type ButtonHTMLAttributes, type Ref } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	isLoading?: boolean;
	fullWidth?: boolean;
	ref?: Ref<HTMLButtonElement>;
}

const sizeClasses: Record<ButtonSize, string> = {
	sm: "text-sm px-3 py-1.5",
	md: "text-sm px-4 py-2",
	lg: "text-base px-6 py-3",
};

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
				`btn-${variant}`,
				sizeClasses[size],
				fullWidth && "w-full",
				isLoading && "cursor-wait",
				className,
			)}
			{...props}
		>
			{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
			{children}
		</button>
	);
}
