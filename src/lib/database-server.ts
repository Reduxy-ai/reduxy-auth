import { Pool } from 'pg'
import { hashPassword, generateApiKey } from './auth'

// Server-side database connection
let pool: Pool | null = null

function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        })

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err)
        })
    }
    return pool
}

export async function query(text: string, params?: any[]): Promise<any> {
    const client = await getPool().connect()
    try {
        const result = await client.query(text, params)
        return result
    } finally {
        client.release()
    }
}

// Initialize database using migration system
export async function initializeDatabase(): Promise<void> {
    try {
        // Import migrations and run them
        const { runMigrations } = await import('./migrations')
        await runMigrations()
        console.log('Database initialized successfully using migrations')
    } catch (error) {
        console.error('Error initializing database:', error)
        throw error
    }
}

// User database functions
export async function createUserInDB(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    company?: string
    plan: string
}) {
    try {
        const hashedPassword = await hashPassword(userData.password)

        // Insert user
        const userResult = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, company, plan, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, company, plan, is_email_verified, created_at, updated_at`,
            [userData.email, hashedPassword, userData.firstName, userData.lastName, userData.company || null, userData.plan, false]
        )

        const user = userResult.rows[0]

        // Create default preferences
        await query(
            `INSERT INTO user_preferences (user_id, theme, email_notifications, security_alerts, weekly_reports, language)
       VALUES ($1, 'system', true, true, false, 'en')`,
            [user.id]
        )

        // Create billing info if plan is not starter
        if (userData.plan !== 'starter') {
            const periodStart = new Date()
            const periodEnd = new Date()
            periodEnd.setMonth(periodEnd.getMonth() + 1)

            await query(
                `INSERT INTO billing_info (user_id, plan, status, current_period_start, current_period_end, cancel_at_period_end)
         VALUES ($1, $2, 'active', $3, $4, false)`,
                [user.id, userData.plan, periodStart, periodEnd]
            )
        }

        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            plan: user.plan,
            isEmailVerified: user.is_email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            company: user.company,
            apiKeys: [],
            preferences: {
                theme: 'system',
                emailNotifications: true,
                securityAlerts: true,
                weeklyReports: false,
                language: 'en'
            }
        }
    } catch (error) {
        console.error('Error creating user:', error)
        throw error
    }
}

export async function findUserByEmailInDB(email: string) {
    try {
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email])

        if (userResult.rows.length === 0) {
            return null
        }

        const user = userResult.rows[0]

        // Get preferences
        const preferencesResult = await query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [user.id]
        )

        // Get API keys (policy_id may not exist if migration hasn't run)
        let apiKeysResult
        try {
            apiKeysResult = await query(
                'SELECT id, name, key_prefix, last_used, created_at, is_active, policy_id FROM api_keys WHERE user_id = $1 AND is_active = true',
                [user.id]
            )
        } catch (e) {
            // Fallback if policy_id column doesn't exist yet
            apiKeysResult = await query(
                'SELECT id, name, key_prefix, last_used, created_at, is_active FROM api_keys WHERE user_id = $1 AND is_active = true',
                [user.id]
            )
        }

        // Get billing info
        const billingResult = await query(
            'SELECT * FROM billing_info WHERE user_id = $1',
            [user.id]
        )

        const preferences = preferencesResult.rows[0] || {
            theme: 'system',
            email_notifications: true,
            security_alerts: true,
            weekly_reports: false,
            language: 'en'
        }

        const apiKeys = apiKeysResult.rows.map((key: any) => ({
            id: key.id,
            name: key.name,
            key: `${key.key_prefix}${'*'.repeat(28)}`, // Show only prefix for security
            lastUsed: key.last_used,
            createdAt: key.created_at,
            isActive: key.is_active,
            policyId: key.policy_id || null
        }))

        const billingInfo = billingResult.rows[0] ? {
            plan: billingResult.rows[0].plan,
            status: billingResult.rows[0].status,
            currentPeriodStart: billingResult.rows[0].current_period_start,
            currentPeriodEnd: billingResult.rows[0].current_period_end,
            cancelAtPeriodEnd: billingResult.rows[0].cancel_at_period_end,
            trialEnd: billingResult.rows[0].trial_end
        } : undefined

        return {
            id: user.id,
            email: user.email,
            password: user.password_hash, // Include for auth verification
            firstName: user.first_name,
            lastName: user.last_name,
            plan: user.plan,
            isEmailVerified: user.is_email_verified,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            company: user.company,
            apiKeys,
            preferences: {
                theme: preferences.theme,
                emailNotifications: preferences.email_notifications,
                securityAlerts: preferences.security_alerts,
                weeklyReports: preferences.weekly_reports,
                language: preferences.language
            },
            billingInfo
        }
    } catch (error) {
        console.error('Error finding user by email:', error)
        return null
    }
}

export async function createApiKeyInDB(userId: string, name: string): Promise<string | null> {
    try {
        const apiKey = generateApiKey()
        const keyHash = await hashPassword(apiKey) // Hash the key for security
        const keyPrefix = apiKey.substring(0, 8) // Store first 8 chars for display

        await query(
            `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())`,
            [userId, name, keyHash, keyPrefix]
        )

        return apiKey // Return the full key only once
    } catch (error) {
        console.error('Error creating API key:', error)
        return null
    }
}

export async function deleteApiKeyInDB(userId: string, keyId: string): Promise<boolean> {
    try {
        const result = await query(
            'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2',
            [keyId, userId]
        )

        return result.rowCount > 0
    } catch (error) {
        console.error('Error deleting API key:', error)
        return false
    }
}

// ==================== POLICY FUNCTIONS ====================

import type { Policy, PolicyData } from '@/types/auth'

// Transform database row to Policy object
function transformPolicyRow(row: any): Policy {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        piiSettings: row.pii_settings,
        documentSettings: row.document_settings,
        imageSettings: row.image_settings,
        textSettings: row.text_settings,
        isDefault: row.is_default,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// Get all policies for a user
export async function getPoliciesForUser(userId: string): Promise<Policy[]> {
    try {
        const result = await query(
            `SELECT * FROM policies 
             WHERE user_id = $1 AND is_active = true 
             ORDER BY is_default DESC, created_at DESC`,
            [userId]
        )
        return result.rows.map(transformPolicyRow)
    } catch (error) {
        console.error('Error getting policies:', error)
        return []
    }
}

// Get a single policy by ID
export async function getPolicyById(policyId: string, userId: string): Promise<Policy | null> {
    try {
        const result = await query(
            'SELECT * FROM policies WHERE id = $1 AND user_id = $2',
            [policyId, userId]
        )
        if (result.rows.length === 0) {
            return null
        }
        return transformPolicyRow(result.rows[0])
    } catch (error) {
        console.error('Error getting policy:', error)
        return null
    }
}

// Get default policy for a user
export async function getDefaultPolicy(userId: string): Promise<Policy | null> {
    try {
        const result = await query(
            'SELECT * FROM policies WHERE user_id = $1 AND is_default = true AND is_active = true',
            [userId]
        )
        if (result.rows.length === 0) {
            return null
        }
        return transformPolicyRow(result.rows[0])
    } catch (error) {
        console.error('Error getting default policy:', error)
        return null
    }
}

// Create a new policy
export async function createPolicyInDB(userId: string, data: PolicyData): Promise<Policy | null> {
    try {
        // If this is set as default, unset other defaults first
        if (data.isDefault) {
            await query(
                'UPDATE policies SET is_default = false WHERE user_id = $1 AND is_default = true',
                [userId]
            )
        }

        const result = await query(
            `INSERT INTO policies (
                user_id, name, description, 
                pii_settings, document_settings, image_settings, text_settings,
                is_default, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            RETURNING *`,
            [
                userId,
                data.name,
                data.description || null,
                JSON.stringify(data.piiSettings || {}),
                JSON.stringify(data.documentSettings || {}),
                JSON.stringify(data.imageSettings || {}),
                JSON.stringify(data.textSettings || {}),
                data.isDefault || false,
            ]
        )

        return transformPolicyRow(result.rows[0])
    } catch (error) {
        console.error('Error creating policy:', error)
        return null
    }
}

// Update an existing policy
export async function updatePolicyInDB(
    policyId: string, 
    userId: string, 
    data: Partial<PolicyData>
): Promise<Policy | null> {
    try {
        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await query(
                'UPDATE policies SET is_default = false WHERE user_id = $1 AND is_default = true AND id != $2',
                [userId, policyId]
            )
        }

        // Build dynamic update query
        const updates: string[] = []
        const values: any[] = []
        let paramCount = 1

        if (data.name !== undefined) {
            updates.push(`name = $${paramCount++}`)
            values.push(data.name)
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramCount++}`)
            values.push(data.description)
        }
        if (data.piiSettings !== undefined) {
            updates.push(`pii_settings = $${paramCount++}`)
            values.push(JSON.stringify(data.piiSettings))
        }
        if (data.documentSettings !== undefined) {
            updates.push(`document_settings = $${paramCount++}`)
            values.push(JSON.stringify(data.documentSettings))
        }
        if (data.imageSettings !== undefined) {
            updates.push(`image_settings = $${paramCount++}`)
            values.push(JSON.stringify(data.imageSettings))
        }
        if (data.textSettings !== undefined) {
            updates.push(`text_settings = $${paramCount++}`)
            values.push(JSON.stringify(data.textSettings))
        }
        if (data.isDefault !== undefined) {
            updates.push(`is_default = $${paramCount++}`)
            values.push(data.isDefault)
        }

        updates.push('updated_at = NOW()')

        if (updates.length === 1) {
            // Only updated_at, nothing else to update
            return await getPolicyById(policyId, userId)
        }

        values.push(policyId, userId)

        const result = await query(
            `UPDATE policies SET ${updates.join(', ')} 
             WHERE id = $${paramCount++} AND user_id = $${paramCount}
             RETURNING *`,
            values
        )

        if (result.rows.length === 0) {
            return null
        }

        return transformPolicyRow(result.rows[0])
    } catch (error) {
        console.error('Error updating policy:', error)
        return null
    }
}

// Delete a policy (soft delete)
export async function deletePolicyInDB(policyId: string, userId: string): Promise<boolean> {
    try {
        // First check if it's the default policy
        const policy = await getPolicyById(policyId, userId)
        if (policy?.isDefault) {
            // Cannot delete default policy
            return false
        }

        // Soft delete
        const result = await query(
            'UPDATE policies SET is_active = false WHERE id = $1 AND user_id = $2',
            [policyId, userId]
        )

        // Also unbind any API keys using this policy
        await query(
            'UPDATE api_keys SET policy_id = NULL WHERE policy_id = $1',
            [policyId]
        )

        return result.rowCount > 0
    } catch (error) {
        console.error('Error deleting policy:', error)
        return false
    }
}

// Bind policy to API key
export async function bindPolicyToApiKey(
    apiKeyId: string, 
    policyId: string | null, 
    userId: string
): Promise<boolean> {
    try {
        // Verify the API key belongs to the user
        const keyCheck = await query(
            'SELECT id FROM api_keys WHERE id = $1 AND user_id = $2',
            [apiKeyId, userId]
        )
        if (keyCheck.rows.length === 0) {
            return false
        }

        // If policyId is provided, verify it belongs to the user
        if (policyId) {
            const policyCheck = await query(
                'SELECT id FROM policies WHERE id = $1 AND user_id = $2 AND is_active = true',
                [policyId, userId]
            )
            if (policyCheck.rows.length === 0) {
                return false
            }
        }

        // Update the binding
        await query(
            'UPDATE api_keys SET policy_id = $1 WHERE id = $2',
            [policyId, apiKeyId]
        )

        return true
    } catch (error) {
        console.error('Error binding policy to API key:', error)
        return false
    }
}

// Create default policy for new user
export async function createDefaultPolicyForUser(userId: string): Promise<Policy | null> {
    const defaultPolicyData: PolicyData = {
        name: 'Default Policy',
        description: 'Default PII detection policy with standard settings',
        isDefault: true,
    }
    return await createPolicyInDB(userId, defaultPolicyData)
} 