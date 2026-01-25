/**
 * Button  Component
 */

import React, { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@lib/cn";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
    ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    disabled,
    ref,
    ...props
}: ButtonProps) {
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn bg-[--color-error] text-white hover:opacity-90',
    }

    const sizeClasses = {
        sm: 'text-sm px-3 py-1.5',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-6 py-3'
    }

    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={cn(
                variantClasses[variant],
                sizeClasses[size],
                fullWidth && 'w-full', isLoading && 'cursor-wait',
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}