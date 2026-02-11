/**
 * Header Component
 */

import { Link, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/common/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useAuth";

export function Header() {
	const navigate = useNavigate();

	const { user } = useAuthStore();

	const logoutMutation = useLogout({
		onSuccess: () => {
			navigate("/login");
		},
		onError: () => {
			navigate("/login");
		},
	});

	const handleLogout = async () => {
		logoutMutation.mutate();
	};

	return (
		<header
			style={{
				backgroundColor: "var(--color-surface-overlay)",
				borderBottom: "1px solid var(--color-border-subtle)",
			}}
		>
			<div className="container-wide">
				<div className="flex items-center justify-between h-16">
					{/* Logo */}
					<Link to="/dashboard">
						<Logo size="sm" />
					</Link>

					{/* Navigation */}
					<nav className="hidden md:flex items-center gap-6">
						<Link
							to="/dashboard"
							className="font-medium transition-colors text-text-secondary hover:text-brand-500"
						>
							Dashboard
						</Link>
						<Link
							to="/transactions"
							className="font-medium transition-colors text-text-secondary hover:text-brand-500"
						>
							Transactions
						</Link>
						<Link
							to="/settings"
							className="font-medium transition-colors text-text-secondary hover:text-brand-500"
						>
							Settings
						</Link>
					</nav>

					{/* Right side */}
					<div className="flex items-center gap-4">
						<ThemeToggle />

						{/* User Info */}
						{user && (
							<div
								className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg"
								style={{
									backgroundColor:
										"var(--color-surface-raised)",
								}}
							>
								<div
									className="h-8 w-8 rounded-full flex items-center justify-center"
									style={{
										background:
											"linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)",
										boxShadow:
											"0 0 10px rgba(0, 240, 255, 0.3)",
									}}
								>
									<User className="h-4 w-4 text-white" />
								</div>
								<div className="text-sm">
									<p
										className="font-medium"
										style={{
											color: "var(--color-text-primary)",
										}}
									>
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
