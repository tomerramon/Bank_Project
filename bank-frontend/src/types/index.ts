/**
 * Types for Banking App
 * 
 * Matches backend API response structures
 */

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

export interface ApiError {
    success: false;
    message: string;
    errors?: string[];
    details?: unknown;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

// ==========================================
// USER TYPES
// ==========================================

export interface User {
    id: string;
    email: string;
    phone: string;
    balance: number;
    balanceInDollars: number;
    isVerified: boolean;
    accountStatus: 'active' | 'suspended' | 'closed';
    profile?: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        address?: {
            street?: string;
            city?: string;
            country?: string;
            zipCode?: string;
        };
    };
    notificationPreferences: {
        email: boolean;
        sms: boolean;
    };
    createdAt: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        balance: number;
        isVerified: boolean;
        accountStatus: string;
    };
}

export interface SignupResponse {
    userId: string;
    devOTP?: string; // Only in development
}

// ==========================================
// TRANSACTION TYPES
// ==========================================

export interface Transaction {
    _id: string;
    userId: string;
    peerUserId: {
        _id: string;
        email: string;
    };
    amount: number;
    amountInDollars: number;
    formattedAmount: string;
    direction: 'T_IN' | 'T_OUT';
    reference: string;
    createdAt: string;
}

export interface TransferResponse {
    reference: string;
    amount: number;
    from: string;
    to: string;
    timestamp: string;
    senderBalance: number;
    senderTransaction: {
        id: string;
        direction: 'T_OUT';
        amount: number;
    };
    receiverTransaction: {
        id: string;
        direction: 'T_IN';
        amount: number;
    };
}

export interface TransactionStats {
    sent: {
        count: number;
        total: number;
    };
    received: {
        count: number;
        total: number;
    };
}

// ==========================================
// FORM TYPES
// ==========================================

export interface LoginFormData {
    email: string;
    password: string;
}

export interface SignupFormData {
    email: string;
    password: string;
    phone: string;
}

export interface VerifyOTPFormData {
    otp: string;
}

export interface TransferFormData {
    toEmail: string;
    amount: number;
}

export interface ChangePasswordFormData {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

// ==========================================
// STORE TYPES
// ==========================================

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User) => void;
    refreshUser: () => Promise<void>;
}

export interface ThemeState {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
}

// ==========================================
// UTILITY TYPES
// ==========================================

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FormFieldError {
    field: string;
    message: string;
}