/**
 * Theme Toggle Component
 *
 */

import { cn } from "@/lib/cn";
import { useThemeStore } from "@/store/themeStore";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
	className?: string;
	showLabel?: boolean;
}

export function ThemeToggle({
	className,
	showLabel = false,
}: ThemeToggleProps) {
	const { theme, toggleTheme } = useThemeStore();

	return (
		<button
			onClick={toggleTheme}
			className={cn("theme-toggle", className)}
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
			title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			{theme === "light" ? (
				<>
					<Moon className="theme-toggle-icon" />
					{showLabel && <span className="label">Dark</span>}
				</>
			) : (
				<>
					<Sun className="theme-toggle-icon" />
					{showLabel && <span className="label">Light</span>}
				</>
			)}
		</button>
	);
}
