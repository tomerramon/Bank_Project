/**
 * Theme Toggle Component
 */

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useThemeStore } from "@/store/themeStore";

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
			className={cn(
				"inline-flex items-center gap-2 p-2 rounded-md bg-gray-100 dark:bg-gray-800",
				"hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
				className,
			)}
			aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
			title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
		>
			{theme === "light" ? (
				<>
					<Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
					{showLabel && (
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Dark
						</span>
					)}
				</>
			) : (
				<>
					<Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
					{showLabel && (
						<span className="text-sm text-gray-700 dark:text-gray-300">
							Light
						</span>
					)}
				</>
			)}
		</button>
	);
}
