import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Utility for merging Tailwind classes
 * 
 * Combines clsx (conditional classes) + tailwind-merge (deduplication)
 * 
 * Example:
 * cn('btn-primary', isLoading && 'opacity-50', className)
 * 
 * Without this, overlapping Tailwind classes cause conflicts:
 * <div className="p-4 p-2"> // Both apply, unexpected result
 * 
 * With twMerge:
 * cn('p-4', 'p-2') // Returns 'p-2' (last wins)
 */
