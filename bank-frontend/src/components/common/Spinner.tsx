/**
 * Spinner Component
 *
 * Loading indicator with optional text
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface SpinnerProps {
	size?: "sm" | "md" | "lg";
	text?: string;
	className?: string;
}

const sizeConfig = {
	sm: "h-4 w-4",
	md: "h-8 w-8",
	lg: "h-12 w-12",
} as const;

export function Spinner({ size = "md", text, className }: SpinnerProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2",
				className,
			)}
		>
			<Loader2
				className={cn("animate-spin text-brand-600", sizeConfig[size])}
			/>
			{text && (
				<p className="text-sm text-gray-600 dark:text-gray-400">
					{text}
				</p>
			)}
		</div>
	);
}

interface FullPageSpinnerProps {
	text?: string;
}

export function FullPageSpinner({ text = "Loading..." }: FullPageSpinnerProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
			<Spinner size="lg" text={text} />
		</div>
	);
}
