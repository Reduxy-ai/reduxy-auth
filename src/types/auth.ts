export type MembershipPlan = 'starter' | 'pro' | 'enterprise'

export interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    plan: MembershipPlan
    isEmailVerified: boolean
    createdAt: string
    updatedAt: string
    avatar?: string
    company?: string
    apiKeys: ApiKey[]
    preferences: UserPreferences
    billingInfo?: BillingInfo
}

export interface ApiKey {
    id: string
    name: string
    key: string
    lastUsed?: string
    createdAt: string
    isActive: boolean
    policyId?: string
    policy?: Policy
}

// PII Types supported by the system
export type PIIType = 
    | 'PERSON' 
    | 'EMAIL' 
    | 'PHONE' 
    | 'SSN' 
    | 'CREDIT_CARD' 
    | 'ADDRESS' 
    | 'DATE' 
    | 'IP_ADDRESS'
    | 'FIRST_NAME'
    | 'LAST_NAME'

// Masking strategies
export type MaskingStrategy = 'token' | 'unique_token' | 'partial' | 'full' | 'none'
export type ImageMaskingStyle = 'blur' | 'black_box' | 'pixelate'

// PII setting for a single entity type
export interface PIISetting {
    enabled: boolean
    strategy: MaskingStrategy
    min_confidence: number
}

// Document-specific settings
export interface DocumentSettings {
    masking_style: MaskingStrategy
    preserve_formatting: boolean
    generate_mapping: boolean
}

// Image-specific settings
export interface ImageSettings {
    masking_style: ImageMaskingStyle
    blur_intensity: number
    include_bounding_boxes: boolean
}

// Text/Chat-specific settings
export interface TextSettings {
    masking_style: MaskingStrategy
    return_mapping: boolean
}

// Policy configuration
export interface Policy {
    id: string
    userId: string
    name: string
    description?: string
    piiSettings: Record<PIIType, PIISetting>
    documentSettings: DocumentSettings
    imageSettings: ImageSettings
    textSettings: TextSettings
    isDefault: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

// Policy creation/update data
export interface PolicyData {
    name: string
    description?: string
    piiSettings?: Partial<Record<PIIType, Partial<PIISetting>>>
    documentSettings?: Partial<DocumentSettings>
    imageSettings?: Partial<ImageSettings>
    textSettings?: Partial<TextSettings>
    isDefault?: boolean
}

// Default PII settings for new policies
export const DEFAULT_PII_SETTINGS: Record<PIIType, PIISetting> = {
    PERSON: { enabled: true, strategy: 'unique_token', min_confidence: 0.85 },
    EMAIL: { enabled: true, strategy: 'token', min_confidence: 0.80 },
    PHONE: { enabled: true, strategy: 'partial', min_confidence: 0.80 },
    SSN: { enabled: true, strategy: 'full', min_confidence: 0.90 },
    CREDIT_CARD: { enabled: true, strategy: 'partial', min_confidence: 0.90 },
    ADDRESS: { enabled: true, strategy: 'token', min_confidence: 0.85 },
    DATE: { enabled: false, strategy: 'token', min_confidence: 0.80 },
    IP_ADDRESS: { enabled: false, strategy: 'token', min_confidence: 0.80 },
    FIRST_NAME: { enabled: true, strategy: 'unique_token', min_confidence: 0.85 },
    LAST_NAME: { enabled: true, strategy: 'unique_token', min_confidence: 0.85 },
}

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
    masking_style: 'unique_token',
    preserve_formatting: true,
    generate_mapping: true,
}

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
    masking_style: 'blur',
    blur_intensity: 25,
    include_bounding_boxes: true,
}

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
    masking_style: 'unique_token',
    return_mapping: true,
}

// PII Type display information
export const PII_TYPE_INFO: Record<PIIType, { label: string; description: string; icon: string }> = {
    PERSON: { label: 'Person Names', description: 'Full names (e.g., John Smith)', icon: '👤' },
    FIRST_NAME: { label: 'First Names', description: 'First names only', icon: '👤' },
    LAST_NAME: { label: 'Last Names', description: 'Last names only', icon: '👤' },
    EMAIL: { label: 'Email Addresses', description: 'Email addresses', icon: '📧' },
    PHONE: { label: 'Phone Numbers', description: 'Phone numbers (intl. supported)', icon: '📱' },
    SSN: { label: 'Social Security', description: 'US Social Security Numbers', icon: '🔐' },
    CREDIT_CARD: { label: 'Credit Cards', description: 'Credit card numbers', icon: '💳' },
    ADDRESS: { label: 'Addresses', description: 'Street addresses', icon: '🏠' },
    DATE: { label: 'Dates', description: 'Date values', icon: '📅' },
    IP_ADDRESS: { label: 'IP Addresses', description: 'IPv4 and IPv6 addresses', icon: '🌐' },
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system'
    emailNotifications: boolean
    securityAlerts: boolean
    weeklyReports: boolean
    language: string
}

export interface BillingInfo {
    plan: MembershipPlan
    status: 'active' | 'cancelled' | 'past_due' | 'trialing'
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd?: string
}

export interface AuthState {
    user: User | null
    isLoading: boolean
    error: string | null
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface RegisterData {
    email: string
    password: string
    firstName: string
    lastName: string
    company?: string
    plan: MembershipPlan
    agreeToTerms: boolean
}

export interface ResetPasswordData {
    email: string
}

export interface UpdatePasswordData {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

export interface UpdateProfileData {
    firstName: string
    lastName: string
    company?: string
    avatar?: string
}

export interface PlanLimits {
    requestsPerMonth: number | 'unlimited'
    piiDetectionTypes: number | 'unlimited'
    customRules: boolean
    logRetentionDays: number | 'custom'
    auditExport: boolean
    teamCollaboration: boolean
    apiRateLimit: string
    support: 'community' | 'priority' | 'dedicated'
    sla: string | null
    soc2Compliance: boolean
    onPremiseDeployment: boolean
    samlSSO: boolean
}

export const PLAN_LIMITS: Record<MembershipPlan, PlanLimits> = {
    starter: {
        requestsPerMonth: 1000,
        piiDetectionTypes: 5,
        customRules: false,
        logRetentionDays: 7,
        auditExport: false,
        teamCollaboration: false,
        apiRateLimit: '10/min',
        support: 'community',
        sla: null,
        soc2Compliance: false,
        onPremiseDeployment: false,
        samlSSO: false
    },
    pro: {
        requestsPerMonth: 100000,
        piiDetectionTypes: 15,
        customRules: true,
        logRetentionDays: 30,
        auditExport: true,
        teamCollaboration: true,
        apiRateLimit: '100/min',
        support: 'priority',
        sla: '99.9%',
        soc2Compliance: true,
        onPremiseDeployment: false,
        samlSSO: false
    },
    enterprise: {
        requestsPerMonth: 'unlimited',
        piiDetectionTypes: 'unlimited',
        customRules: true,
        logRetentionDays: 'custom',
        auditExport: true,
        teamCollaboration: true,
        apiRateLimit: 'Custom',
        support: 'dedicated',
        sla: 'Custom',
        soc2Compliance: true,
        onPremiseDeployment: true,
        samlSSO: true
    }
}

export const PLAN_DETAILS = {
    starter: {
        name: 'Starter',
        price: 'Free',
        description: 'Perfect for small projects and prototypes',
        features: [
            '1,000 requests/month',
            'Basic PII detection',
            'Standard support',
            'Community access',
            'Basic audit logs'
        ],
        limitations: [
            'Limited to 2 projects',
            '7-day log retention',
            'No custom rules'
        ]
    },
    pro: {
        name: 'Pro',
        price: '$99/month',
        description: 'Ideal for growing businesses and production workloads',
        features: [
            '100,000 requests/month',
            'Advanced PII detection',
            'Custom detection rules',
            'Priority support',
            'SOC 2 report access',
            '30-day log retention',
            'Audit export (CSV/JSON)',
            'Multiple projects',
            'Team collaboration'
        ],
        limitations: []
    },
    enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        description: 'For large organizations with specific requirements',
        features: [
            'Unlimited requests',
            'Enterprise-grade PII detection',
            'Custom detection models',
            '24/7 dedicated support',
            'On-premise deployment',
            'VPC peering',
            'Custom SLAs',
            'SAML/SSO integration',
            'BAA/DPA available',
            'Custom log retention',
            'Real-time compliance reporting',
            'Dedicated customer success'
        ],
        limitations: []
    }
} 