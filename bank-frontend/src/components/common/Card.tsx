/**
 * Card Component
 *
 * Composable card with header, content, and footer sections
 */

import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	ref?: Ref<HTMLDivElement>;
}

export function Card({ children, className, ref, ...props }: CardProps) {
	return (
		<div ref={ref} className={cn("card p-6", className)} {...props}>
			{children}
		</div>
	);
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	ref?: Ref<HTMLDivElement>;
}

export function CardHeader({
	children,
	className,
	ref,
	...props
}: CardHeaderProps) {
	return (
		<div ref={ref} className={cn("mb-4", className)} {...props}>
			{children}
		</div>
	);
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	ref?: Ref<HTMLDivElement>;
}

export function CardContent({
	children,
	className,
	ref,
	...props
}: CardContentProps) {
	return (
		<div ref={ref} className={cn("", className)} {...props}>
			{children}
		</div>
	);
}
