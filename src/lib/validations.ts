import { z } from 'zod'
import validator from 'validator'

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
    password: z
        .string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters')
})

export const registerSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .refine(
            (email) => validator.isEmail(email),
            'Please enter a valid email address'
        ),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    confirmPassword: z.string(),
    firstName: z
        .string()
        .min(1, 'First name is required')
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters'),
    company: z
        .string()
        .max(100, 'Company name must be less than 100 characters')
        .optional(),
    plan: z.enum(['starter', 'pro', 'enterprise']),
    agreeToTerms: z
        .boolean()
        .refine((val) => val === true, 'You must agree to the terms and conditions')
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

export const resetPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
})

export const updatePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

export const updateProfileSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name is required')
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters'),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters'),
    company: z
        .string()
        .max(100, 'Company name must be less than 100 characters')
        .optional(),
    avatar: z.string().url('Please enter a valid URL').optional()
})

export const updatePreferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']),
    emailNotifications: z.boolean(),
    securityAlerts: z.boolean(),
    weeklyReports: z.boolean(),
    language: z.string().min(2, 'Language code must be at least 2 characters')
})

export const createApiKeySchema = z.object({
    name: z
        .string()
        .min(1, 'API key name is required')
        .min(3, 'API key name must be at least 3 characters')
        .max(50, 'API key name must be less than 50 characters')
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesFormData = z.infer<typeof updatePreferencesSchema>
export type CreateApiKeyFormData = z.infer<typeof createApiKeySchema> 