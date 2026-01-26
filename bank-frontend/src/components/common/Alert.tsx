/**
 * Alert Component
 *
 * Variants: success, error, warning, info
 * Dismissible option
 */

import type { ReactNode } from "react";
import {
	CheckCircle2,
	AlertCircle,
	AlertTriangle,
	Info,
	X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const variantIcon = {
	success: CheckCircle2,
	error: AlertCircle,
	warning: AlertTriangle,
	info: Info,
} as const;

type AlertVariant = keyof typeof variantIcon;

interface AlertProps {
	variant?: AlertVariant;
	title?: string;
	children: ReactNode;
	onDismiss?: () => void;
	className?: string;
}

export function Alert({
	variant = "info",
	title,
	children,
	onDismiss,
	className,
}: AlertProps) {
	
	const Icon = variantIcon[variant];

	return (
		<div
			role="alert"
			className={cn("alert", `alert-${variant}`, className)}
		>
			<div className="alert-content">
				<Icon className="alert-icon" />

				<div className="alert-body">
					{title && <h3 className="alert-title">{title}</h3>}
					<div className="alert-message">{children}</div>
				</div>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className={cn("alert-dismiss", "alert-message")}
						aria-label="Dismiss alert"
					>
						<X className="alert-dismiss-icon" />
					</button>
				)}
			</div>
		</div>
	);
}
