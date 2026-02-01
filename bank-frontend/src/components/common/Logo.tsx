/**
 * Logo Component
 */

import { Shield } from "lucide-react";
import { cn } from "@/lib/cn";

interface LogoProps {
	size?: "sm" | "md" | "lg" | "xl";
	showText?: boolean;
	className?: string;
}

const sizeConfig = {
	sm: {
		icon: "h-4 w-4",
		container: "h-8 w-8",
		text: "text-sm",
	},
	md: {
		icon: "h-6 w-6",
		container: "h-12 w-12",
		text: "text-xl",
	},
	lg: {
		icon: "h-8 w-8",
		container: "h-16 w-16",
		text: "text-2xl",
	},
	xl: {
		icon: "h-12 w-12",
		container: "h-24 w-24",
		text: "text-4xl",
	},
} as const;

export function Logo({ size = "md", showText = true, className }: LogoProps) {
	const config = sizeConfig[size];

	return (
		<div className={cn("flex items-center gap-3", className)}>
			{/* Shield Logo with Cyberpunk Glow */}
			<div className="relative">
				{/* Outer glow effect */}
				<div
					className={cn(
						"absolute inset-0 rounded-full opacity-50 blur-md",
						config.container,
					)}
					style={{
						background:
							"linear-gradient(135deg, #00f0ff 0%, #a855f7 50%, #00f0ff 100%)",
					}}
				/>

				{/* Inner shield container */}
				<div
					className={cn(
						"relative rounded-full flex items-center justify-center border-2",
						config.container,
					)}
					style={{
						background:
							"linear-gradient(135deg, #0a0e27 0%, #1a1333 100%)",
						borderColor: "rgba(0, 240, 255, 0.5)",
						boxShadow: "0 0 20px rgba(0, 240, 255, 0.3)",
					}}
				>
					{/* Shield icon */}
					<Shield
						className={cn(config.icon, "text-neon-cyan")}
						strokeWidth={2}
					/>

					{/* Subtle circuit lines */}
					<div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
						<div
							className="absolute top-1/4 left-1/4 w-1/2 h-px"
							style={{
								background:
									"linear-gradient(90deg, transparent, #00f0ff, transparent)",
							}}
						/>
						<div
							className="absolute top-3/4 left-1/4 w-1/2 h-px"
							style={{
								background:
									"linear-gradient(90deg, transparent, #a855f7, transparent)",
							}}
						/>
					</div>
				</div>
			</div>

			{/* Night Vault Bank Text */}
			{showText && (
				<div className="flex flex-col">
					<span
						className={cn(
							"font-bold tracking-wide uppercase",
							config.text,
						)}
						style={{
							background:
								"linear-gradient(135deg, #00f0ff 0%, #4dd4ff 100%)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							backgroundClip: "text",
							filter: "drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))",
							letterSpacing: "0.1em",
						}}
					>
						NIGHT VAULT
					</span>
					{size !== "sm" && (
						<span
							className="text-xs font-medium tracking-wider uppercase text-text-tertiary"
							style={{
								letterSpacing: "0.15em",
							}}
						>
							BANK
						</span>
					)}
				</div>
			)}
		</div>
	);
}
