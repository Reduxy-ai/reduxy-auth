"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { registerSchema, type RegisterFormData } from "@/lib/validations"
import { PLAN_DETAILS, type MembershipPlan } from "@/types/auth"
import { Check, ArrowLeft, Loader2, Zap, Rocket, Crown, Building2, TrendingUp, Shield, AlertCircle } from "lucide-react"

function RegisterContent() {
    const searchParams = useSearchParams()
    const [step, setStep] = useState<'plan' | 'details'>('plan')
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan>('starter')
    const [formData, setFormData] = useState<Partial<RegisterFormData>>({
        plan: 'starter'
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handlePlanSelection = (plan: MembershipPlan) => {
        setSelectedPlan(plan)
        setFormData(prev => ({ ...prev, plan }))
    }

    const handleContinueToDetails = () => {
        setStep('details')
    }

    const handleBackToPlan = () => {
        setStep('plan')
    }

    const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})

        try {
            // Get redirect_uri from URL params
            const redirectUri = searchParams.get('redirect_uri')

            if (!redirectUri) {
                setErrors({ general: 'Missing redirect_uri parameter' })
                setLoading(false)
                return
            }

            const result = registerSchema.safeParse(formData)
            if (!result.success) {
                const formErrors: Record<string, string> = {}
                result.error.issues.forEach(error => {
                    formErrors[error.path[0] as string] = error.message
                })
                setErrors(formErrors)
                setLoading(false)
                return
            }

            // Call local register API with redirect_uri
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...result.data,
                    redirect_uri: redirectUri
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setErrors({ general: data.error || 'Registration failed' })
                setLoading(false)
                return
            }

            // Registration successful, cookie is set, redirect to original location
            window.location.href = data.redirect_uri
        } catch (error) {
            setErrors({ general: 'An unexpected error occurred' })
        } finally {
            setLoading(false)
        }
    }

    const getPlanIcon = (plan: MembershipPlan) => {
        switch (plan) {
            case 'starter': return <Rocket className="h-6 w-6" />
            case 'pro': return <TrendingUp className="h-6 w-6" />
            case 'enterprise': return <Crown className="h-6 w-6" />
            default: return <Rocket className="h-6 w-6" />
        }
    }

    const getPlanColor = (plan: MembershipPlan) => {
        switch (plan) {
            case 'starter': return 'from-green-500 to-emerald-600'
            case 'pro': return 'from-blue-500 to-blue-600'
            case 'enterprise': return 'from-purple-500 to-purple-600'
            default: return 'from-green-500 to-emerald-600'
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding & Features */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20"></div>
                {/* Theme Toggle */}
                <div className="absolute top-6 right-6 z-20">
                </div>
                <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white">
                    <div className="mb-8">
                        <div className="flex items-center mb-4">
                            <Zap className="h-8 w-8 mr-3" />
                            <h1 className="text-3xl font-bold">Reduxy</h1>
                        </div>
                        <p className="text-xl text-purple-100">Join thousands of developers</p>
                    </div>

                    <div className="space-y-6 max-w-md">
                        <div className="flex items-start space-x-4">
                            <Shield className="h-6 w-6 text-purple-200 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">Secure by Default</h3>
                                <p className="text-purple-100 text-sm">Enterprise-grade security with advanced API key management and access controls.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <Building2 className="h-6 w-6 text-purple-200 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">Scale with Confidence</h3>
                                <p className="text-purple-100 text-sm">From startup to enterprise, our infrastructure grows with your needs.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <TrendingUp className="h-6 w-6 text-purple-200 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">Performance Analytics</h3>
                                <p className="text-purple-100 text-sm">Deep insights into your AI gateway performance and usage patterns.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-purple-200">
                        <p className="text-sm">"The best AI gateway management platform we've used."</p>
                        <p className="text-xs mt-2 opacity-75">— CTO, Fortune 500 Company</p>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 left-20 w-24 h-24 bg-blue-400/20 rounded-full blur-lg"></div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
                {/* Theme Toggle for mobile */}
                <div className="absolute top-6 right-6 lg:hidden">
                </div>
                <div className="mx-auto w-full max-w-md">
                    <div className="mb-8 text-center lg:text-left">
                        <div className="lg:hidden flex items-center justify-center mb-6">
                            <Zap className="h-8 w-8 mr-3 text-purple-600" />
                            <h1 className="text-3xl font-bold">Reduxy</h1>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {step === 'plan' ? 'Choose your plan' : 'Create your account'}
                        </h2>
                        <p className="text-muted-foreground mt-2">
                            {step === 'plan'
                                ? 'Select the perfect plan for your needs'
                                : 'Enter your details to get started'
                            }
                        </p>
                    </div>

                    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                        <CardContent className="p-0 lg:p-6">
                            {step === 'plan' ? (
                                <div className="space-y-4">
                                    {(Object.keys(PLAN_DETAILS) as MembershipPlan[]).map((plan) => {
                                        const planDetails = PLAN_DETAILS[plan]
                                        const isSelected = selectedPlan === plan
                                        return (
                                            <div
                                                key={plan}
                                                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${isSelected
                                                    ? 'border-purple-500 bg-purple-500/5 shadow-sm'
                                                    : 'border-gray-200 hover:border-gray-100 hover:bg-purple-700/30'
                                                    }`}
                                                onClick={() => handlePlanSelection(plan)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlanColor(plan)} flex items-center justify-center text-white text-sm`}>
                                                            {getPlanIcon(plan)}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{planDetails.name}</h3>
                                                            <p className="text-sm text-muted-foreground">{planDetails.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold">{planDetails.price}</div>
                                                        {plan !== 'starter' && (
                                                            <div className="text-sm text-muted-foreground">per month</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-1 gap-2">
                                                    {planDetails.features.slice(0, 3).map((feature, index) => (
                                                        <div key={index} className="flex items-center space-x-2 text-sm">
                                                            <Check className="h-4 w-4 text-green-500" />
                                                            <span>{feature}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {isSelected && (
                                                    <div className="absolute bottom-4 right-4">
                                                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                            <Check className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    <Button
                                        onClick={handleContinueToDetails}
                                        className="w-full h-11 bg-purple-600 hover:bg-purple-700"
                                    >
                                        Continue with {PLAN_DETAILS[selectedPlan].name}
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleBackToPlan}
                                            className="p-0 h-auto"
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-1" />
                                            Back to plans
                                        </Button>
                                        <Badge variant="secondary">{PLAN_DETAILS[selectedPlan].name}</Badge>
                                    </div>

                                    {errors.general && (
                                        <div className="flex items-start gap-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/50 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium">Registration failed</p>
                                                <p className="mt-1 text-red-600 dark:text-red-300">{errors.general}</p>
                                                {errors.general.includes('already registered') && (
                                                    <Link href="/login" className="mt-2 inline-block text-purple-600 hover:underline font-medium">
                                                        Go to login →
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First name</Label>
                                            <Input
                                                id="firstName"
                                                placeholder="John"
                                                value={formData.firstName || ''}
                                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                className="h-11"
                                                required
                                            />
                                            {errors.firstName && (
                                                <span className="text-sm text-red-600">{errors.firstName}</span>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last name</Label>
                                            <Input
                                                id="lastName"
                                                placeholder="Doe"
                                                value={formData.lastName || ''}
                                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                className="h-11"
                                                required
                                            />
                                            {errors.lastName && (
                                                <span className="text-sm text-red-600">{errors.lastName}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@company.com"
                                            value={formData.email || ''}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="h-11"
                                            required
                                        />
                                        {errors.email && (
                                            <span className="text-sm text-red-600">{errors.email}</span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company">Company (optional)</Label>
                                        <Input
                                            id="company"
                                            placeholder="Your company name"
                                            value={formData.company || ''}
                                            onChange={(e) => handleInputChange('company', e.target.value)}
                                            className="h-11"
                                        />
                                        {errors.company && (
                                            <span className="text-sm text-red-600">{errors.company}</span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Create a strong password"
                                            value={formData.password || ''}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            className="h-11"
                                            required
                                        />
                                        {errors.password && (
                                            <span className="text-sm text-red-600">{errors.password}</span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword || ''}
                                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                            className="h-11"
                                            required
                                        />
                                        {errors.confirmPassword && (
                                            <span className="text-sm text-red-600">{errors.confirmPassword}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="agreeToTerms"
                                            checked={formData.agreeToTerms || false}
                                            onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
                                        />
                                        <Label htmlFor="agreeToTerms" className="text-sm">
                                            I agree to the{' '}
                                            <Link href="/terms" className="text-purple-600 hover:text-purple-500 hover:underline">
                                                Terms of Service
                                            </Link>
                                            {' '}and{' '}
                                            <Link href="/privacy" className="text-purple-600 hover:text-purple-500 hover:underline">
                                                Privacy Policy
                                            </Link>
                                        </Label>
                                    </div>
                                    {errors.agreeToTerms && (
                                        <span className="text-sm text-red-600">{errors.agreeToTerms}</span>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-purple-600 hover:bg-purple-700"
                                        disabled={loading}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create your account
                                    </Button>
                                </form>
                            )}

                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Already have an account?{" "}
                                    <Link
                                        href={`/login?redirect_uri=${searchParams.get('redirect_uri') || ''}`}
                                        className="text-purple-600 hover:text-purple-500 font-medium hover:underline"
                                    >
                                        Sign in instead
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    )
} 