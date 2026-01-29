/**
 * Header Component
 */

import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, /* CreditCard */ } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/common/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuthStore } from "@/store/authStore";

export function Header() {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();

	const handleLogout = async () => {
		try {
			await logout();
			navigate("/login");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	return (
		<header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
			<div className="container-wide">
				<div className="flex items-center justify-between h-16">
					{/* Logo */}
					<Link to="/dashboard">
						<Logo size="md" />
					</Link>

					{/* Navigation */}
					<nav className="hidden md:flex items-center gap-6">
						<Link
							to="/dashboard"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
						>
							Dashboard
						</Link>
						<Link
							to="/transactions"
							className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
						>
							Transactions
						</Link>
					</nav>

					{/* Right side */}
					<div className="flex items-center gap-4">
						<ThemeToggle />

						{/* User Info */}
						{user && (
							<div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
								<div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center">
									<User className="h-4 w-4 text-white" />
								</div>
								<div className="text-sm">
									<p className="font-medium text-gray-900 dark:text-gray-100">
										{user.email}
									</p>
								</div>
							</div>
						)}

						{/* Logout */}
						<Button
							variant="ghost"
							size="sm"
							onClick={handleLogout}
							title="Logout"
						>
							<LogOut className="h-4 w-4" />
							<span className="hidden sm:inline">Logout</span>
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
