/**
 * FormField Component
 * 
 * Wrapper that combines:
 * - Label
 * - Input
 * - Error message
 * - Helper text
 */

import { type InputHTMLAttributes, type Ref, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@lib/cn";


interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'ref'> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    ref?: Ref<HTMLInputElement>;
}


export function FormField({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className,
    fullWidth = true,
    required = false,
    id,
    ref,
    ...props
}: FormFieldProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={cn('form-group', fullWidth && 'w-full')}>
            {label && (
                <label htmlFor={inputId} className="label">
                    {label}
                    {required && <span className="text-[--color-error] ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-tertiary] pointer-events-none">
                        {leftIcon}
                    </div>
                )}

                <input ref={ref} id={inputId} className={cn(
                    error ? 'input-error' : 'input',
                    leftIcon && 'pl-10',
                    (rightIcon || error) && 'pr-10',
                    className)}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
                    }
                    {...props}
                />

                {error ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <AlertCircle className="h-5 w-5 text-[--color-error]" />
                    </div>
                )
                    :
                    (
                        rightIcon && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-tertiary] pointer-events-none">
                                {rightIcon}
                            </div>
                        )
                    )}
            </div>

            {error && (
                <p id={`${inputId}-error`} className="error-text" role="alert">
                    {error}
                </p>
            )}

            {!error && helperText && (
                <p id={`${inputId}-helper`} className="mt-1 text-xs text-[--color-text-tertiary]">
                    {helperText}
                </p>
            )}
        </div>
    );
}

