/**
 * Logo Component - Night Vault Bank
 * Cyberpunk-themed shield logo with glowing effects
 */

import { Shield } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LogoProps {
	size?: 'sm' | 'md' | 'lg' | 'xl';
	showText?: boolean;
	className?: string;
}

const sizeConfig = {
	sm: {
		icon: 'h-5 w-5',
		container: 'h-10 w-10',
		text: 'text-base',
		glowSize: '10px',
	},
	md: {
		icon: 'h-8 w-8',
		container: 'h-16 w-16',
		text: 'text-2xl',
		glowSize: '15px',
	},
	lg: {
		icon: 'h-10 w-10',
		container: 'h-20 w-20',
		text: 'text-3xl',
		glowSize: '20px',
	},
	xl: {
		icon: 'h-16 w-16',
		container: 'h-32 w-32',
		text: 'text-5xl',
		glowSize: '30px',
	},
} as const;

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
	const config = sizeConfig[size];

	return (
		<div className={cn('flex flex-col items-center gap-4', className)}>
			{/* Shield Logo with Cyberpunk Glow */}
			<div className="relative logo-glow">
				{/* Outer rotating glow ring */}
				<div 
					className="absolute inset-0 rounded-full animate-spin"
					style={{
						background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-accent-500) 100%)',
						filter: `blur(${config.glowSize})`,
						opacity: 0.4,
						animationDuration: '8s',
					}}
				/>
				
				{/* Inner shield container */}
				<div
					className={cn(
						'relative rounded-full flex items-center justify-center border-2',
						config.container,
					)}
					style={{
						background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%)',
						borderColor: 'var(--color-brand-500)',
						boxShadow: `
							0 0 ${config.glowSize} var(--color-brand-500),
							inset 0 0 20px rgba(0, 240, 255, 0.1)
						`,
					}}
				>
					{/* Shield icon */}
					<Shield 
						className={cn('text-brand-500 relative z-10', config.icon)} 
						strokeWidth={2}
					/>
					
					{/* NV letters overlay - SVG custom design */}
					<svg 
						className="absolute inset-0 w-full h-full"
						viewBox="0 0 100 100"
						xmlns="http://www.w3.org/2000/svg"
					>
						{/* N letter */}
						<path
							d="M 35 40 L 35 60 L 40 50 L 40 60"
							stroke="var(--color-brand-500)"
							strokeWidth="2"
							fill="none"
							opacity="0.6"
						/>
						{/* V letter */}
						<path
							d="M 55 40 L 60 60 L 65 40"
							stroke="var(--color-brand-500)"
							strokeWidth="2"
							fill="none"
							opacity="0.6"
						/>
					</svg>
					
					{/* Circuit pattern overlay */}
					<div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
						{/* Horizontal circuit line */}
						<div 
							className="absolute top-1/3 left-1/4 right-1/4 h-px"
							style={{
								background: 'linear-gradient(90deg, transparent, var(--color-brand-500), transparent)',
							}}
						/>
						{/* Vertical circuit line */}
						<div 
							className="absolute bottom-1/3 left-1/4 right-1/4 h-px"
							style={{
								background: 'linear-gradient(90deg, transparent, var(--color-accent-500), transparent)',
							}}
						/>
						{/* Circuit dots */}
						<circle cx="30" cy="50" r="1.5" fill="var(--color-brand-500)" />
						<circle cx="70" cy="50" r="1.5" fill="var(--color-brand-500)" />
					</div>
				</div>

				{/* Pulsing secondary glow */}
				<div 
					className="absolute inset-0 rounded-full glow-pulse pointer-events-none"
					style={{
						background: 'radial-gradient(circle, var(--color-brand-500) 0%, transparent 70%)',
						opacity: 0.2,
					}}
				/>
			</div>

			{/* Night Vault Text */}
			{showText && (
				<div className="flex flex-col items-center gap-1">
					<span
						className={cn(
							'font-bold tracking-wider uppercase title-glow',
							config.text,
						)}
						style={{
							fontFamily: '"Exo 2", "Orbitron", -apple-system, sans-serif',
							letterSpacing: '0.15em',
						}}
					>
						Night Vault
					</span>
					<span className="text-xs text-text-tertiary tracking-wide uppercase">
						Secure Banking
					</span>
				</div>
			)}
		</div>
	);
}

/**
 * Simplified Logo for Header/Navbar (without text or complex effects)
 */
export function LogoSimple({ size = 'sm', className }: Omit<LogoProps, 'showText'>) {
	const config = sizeConfig[size];

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div
				className={cn(
					'rounded-full flex items-center justify-center border-2',
					config.container,
				)}
				style={{
					background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
					borderColor: 'var(--color-brand-500)',
					boxShadow: '0 0 10px var(--color-brand-500)',
				}}
			>
				<Shield 
					className={cn('text-brand-500', config.icon)} 
					strokeWidth={2}
				/>
			</div>
			<span className={cn('font-bold text-text-primary', config.text)}>
				Night Vault
			</span>
		</div>
	);
}