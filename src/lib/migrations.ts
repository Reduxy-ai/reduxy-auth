import { query } from './database-server'

// Migration interface
interface Migration {
    id: string
    name: string
    up: string
    down: string
    timestamp: string
}

// All database migrations
const migrations: Migration[] = [
    {
        id: '001',
        name: 'initial_schema',
        timestamp: '2024-01-01T00:00:00Z',
        up: `
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company VARCHAR(255),
        plan VARCHAR(50) NOT NULL DEFAULT 'starter',
        is_email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create API keys table
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_used TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create user preferences table
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        email_notifications BOOLEAN DEFAULT TRUE,
        security_alerts BOOLEAN DEFAULT TRUE,
        weekly_reports BOOLEAN DEFAULT FALSE,
        language VARCHAR(10) DEFAULT 'en'
      );

      -- Create billing info table
      CREATE TABLE IF NOT EXISTS billing_info (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        trial_end TIMESTAMP WITH TIME ZONE,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_billing_info_user_id ON billing_info(user_id);
      CREATE INDEX IF NOT EXISTS idx_billing_info_stripe_customer ON billing_info(stripe_customer_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
    `,
        down: `
      -- Drop all tables and indexes (use with caution!)
      DROP INDEX IF EXISTS idx_api_keys_active;
      DROP INDEX IF EXISTS idx_billing_info_stripe_customer;
      DROP INDEX IF EXISTS idx_billing_info_user_id;
      DROP INDEX IF EXISTS idx_api_keys_key_hash;
      DROP INDEX IF EXISTS idx_api_keys_user_id;
      DROP INDEX IF EXISTS idx_users_email;
      
      DROP TABLE IF EXISTS billing_info CASCADE;
      DROP TABLE IF EXISTS user_preferences CASCADE;
      DROP TABLE IF EXISTS api_keys CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `
    },
    {
        id: '002',
        name: 'add_usage_tracking',
        timestamp: '2024-01-15T10:00:00Z',
        up: `
      -- Create usage tracking table
      CREATE TABLE IF NOT EXISTS usage_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        status_code INTEGER NOT NULL,
        request_size INTEGER DEFAULT 0,
        response_size INTEGER DEFAULT 0,
        processing_time_ms INTEGER DEFAULT 0,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for usage tracking
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_api_key_id ON usage_tracking(api_key_id);
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_created_at ON usage_tracking(created_at);
      CREATE INDEX IF NOT EXISTS idx_usage_tracking_endpoint ON usage_tracking(endpoint);

      -- Update API keys table to track last usage
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
    `,
        down: `
      -- Remove usage tracking
      ALTER TABLE api_keys DROP COLUMN IF EXISTS usage_count;
      
      DROP INDEX IF EXISTS idx_usage_tracking_endpoint;
      DROP INDEX IF EXISTS idx_usage_tracking_created_at;
      DROP INDEX IF EXISTS idx_usage_tracking_api_key_id;
      DROP INDEX IF EXISTS idx_usage_tracking_user_id;
      
      DROP TABLE IF EXISTS usage_tracking CASCADE;
    `
    },
    {
        id: '003',
        name: 'add_webhooks_support',
        timestamp: '2024-02-01T12:00:00Z',
        up: `
      -- Create webhooks table
      CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(2048) NOT NULL,
        secret_key VARCHAR(255) NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create webhook deliveries table for tracking
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        response_status INTEGER,
        response_body TEXT,
        attempts INTEGER DEFAULT 0,
        next_retry_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        delivered_at TIMESTAMP WITH TIME ZONE
      );

      -- Create indexes for webhooks
      CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';
    `,
        down: `
      -- Remove webhooks support
      DROP INDEX IF EXISTS idx_webhook_deliveries_retry;
      DROP INDEX IF EXISTS idx_webhook_deliveries_status;
      DROP INDEX IF EXISTS idx_webhook_deliveries_webhook_id;
      DROP INDEX IF EXISTS idx_webhooks_active;
      DROP INDEX IF EXISTS idx_webhooks_user_id;
      
      DROP TABLE IF EXISTS webhook_deliveries CASCADE;
      DROP TABLE IF EXISTS webhooks CASCADE;
    `
    },
    {
        id: '004',
        name: 'add_policies',
        timestamp: '2026-01-09T12:00:00Z',
        up: `
      -- Create policies table for PII detection configuration
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        
        -- PII type settings (which types to detect and how to mask)
        pii_settings JSONB NOT NULL DEFAULT '{
          "PERSON": {"enabled": true, "strategy": "unique_token", "min_confidence": 0.85},
          "EMAIL": {"enabled": true, "strategy": "token", "min_confidence": 0.80},
          "PHONE": {"enabled": true, "strategy": "partial", "min_confidence": 0.80},
          "SSN": {"enabled": true, "strategy": "full", "min_confidence": 0.90},
          "CREDIT_CARD": {"enabled": true, "strategy": "partial", "min_confidence": 0.90},
          "ADDRESS": {"enabled": true, "strategy": "token", "min_confidence": 0.85},
          "DATE": {"enabled": false, "strategy": "token", "min_confidence": 0.80},
          "IP_ADDRESS": {"enabled": false, "strategy": "token", "min_confidence": 0.80}
        }',
        
        -- Document-specific settings (PDF, DOCX, XLSX, PPTX)
        document_settings JSONB NOT NULL DEFAULT '{
          "masking_style": "unique_token",
          "preserve_formatting": true,
          "generate_mapping": true
        }',
        
        -- Image-specific settings (PNG, JPG, etc.)
        image_settings JSONB NOT NULL DEFAULT '{
          "masking_style": "blur",
          "blur_intensity": 25,
          "include_bounding_boxes": true
        }',
        
        -- Text/Chat-specific settings
        text_settings JSONB NOT NULL DEFAULT '{
          "masking_style": "unique_token",
          "return_mapping": true
        }',
        
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add policy_id to api_keys (each key can be bound to a policy)
      ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id) ON DELETE SET NULL;

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
      CREATE INDEX IF NOT EXISTS idx_policies_default ON policies(is_default) WHERE is_default = TRUE;
      CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active) WHERE is_active = TRUE;
      CREATE INDEX IF NOT EXISTS idx_api_keys_policy_id ON api_keys(policy_id);

      -- Ensure only one default policy per user
      CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_user_default 
        ON policies(user_id) 
        WHERE is_default = TRUE;
    `,
        down: `
      -- Remove policies support
      DROP INDEX IF EXISTS idx_policies_user_default;
      DROP INDEX IF EXISTS idx_api_keys_policy_id;
      DROP INDEX IF EXISTS idx_policies_active;
      DROP INDEX IF EXISTS idx_policies_default;
      DROP INDEX IF EXISTS idx_policies_user_id;
      
      ALTER TABLE api_keys DROP COLUMN IF EXISTS policy_id;
      
      DROP TABLE IF EXISTS policies CASCADE;
    `
    },
    {
        id: '005',
        name: 'add_detection_feedback',
        timestamp: '2026-01-10T12:00:00Z',
        up: `
      -- Create detection feedback table for collecting user corrections
      CREATE TABLE IF NOT EXISTS detection_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Detection details
        detection_id VARCHAR(255),
        original_text TEXT NOT NULL,
        detected_value TEXT NOT NULL,
        detected_entity_type VARCHAR(100) NOT NULL,
        original_confidence DECIMAL(5,4),
        
        -- User feedback
        feedback_type VARCHAR(50) NOT NULL, -- 'correct', 'wrong_type', 'not_pii', 'missed_pii'
        correct_entity_type VARCHAR(100), -- If wrong_type, what should it be
        correct_value TEXT, -- If partial detection, what's the correct value
        
        -- Context
        context_before TEXT,
        context_after TEXT,
        document_type VARCHAR(100), -- 'text', 'pdf', 'image', etc.
        
        -- Metadata
        source VARCHAR(100), -- 'dashboard', 'api', 'test_lab'
        metadata JSONB DEFAULT '{}',
        
        -- Status for training pipeline
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'applied', 'rejected'
        reviewed_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID REFERENCES users(id),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON detection_feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_entity_type ON detection_feedback(detected_entity_type);
      CREATE INDEX IF NOT EXISTS idx_feedback_type ON detection_feedback(feedback_type);
      CREATE INDEX IF NOT EXISTS idx_feedback_status ON detection_feedback(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_created ON detection_feedback(created_at DESC);
      
      -- Aggregated feedback stats table for quick lookups
      CREATE TABLE IF NOT EXISTS feedback_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(100) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        
        total_feedback INT DEFAULT 0,
        correct_count INT DEFAULT 0,
        wrong_type_count INT DEFAULT 0,
        not_pii_count INT DEFAULT 0,
        missed_pii_count INT DEFAULT 0,
        
        accuracy_rate DECIMAL(5,4),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(entity_type, period_start, period_end)
      );
    `,
        down: `
      DROP TABLE IF EXISTS feedback_stats CASCADE;
      DROP INDEX IF EXISTS idx_feedback_created;
      DROP INDEX IF EXISTS idx_feedback_status;
      DROP INDEX IF EXISTS idx_feedback_type;
      DROP INDEX IF EXISTS idx_feedback_entity_type;
      DROP INDEX IF EXISTS idx_feedback_user_id;
      DROP TABLE IF EXISTS detection_feedback CASCADE;
    `
    },
    {
        id: '006',
        name: 'add_credits_system',
        timestamp: '2026-02-12T12:00:00Z',
        up: `
      -- Add credits columns to existing billing_info table
      ALTER TABLE billing_info
        ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 10,
        ADD COLUMN IF NOT EXISTS credits_total INTEGER DEFAULT 10,
        ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month';

      -- Set initial credits based on plan
      UPDATE billing_info SET
        credits_remaining = CASE plan
          WHEN 'free' THEN 10
          WHEN 'starter' THEN 100
          WHEN 'pro' THEN 500
          WHEN 'enterprise' THEN 999999
          ELSE 10
        END,
        credits_total = CASE plan
          WHEN 'free' THEN 10
          WHEN 'starter' THEN 100
          WHEN 'pro' THEN 500
          WHEN 'enterprise' THEN 999999
          ELSE 10
        END
      WHERE credits_remaining IS NULL;

      -- Create credit transactions table for history
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_type VARCHAR(50) NOT NULL,
        credits_used INTEGER NOT NULL,
        credits_remaining INTEGER NOT NULL,
        request_id VARCHAR(255),
        endpoint VARCHAR(255),
        file_size_bytes INTEGER,
        processing_time_ms FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add credits_used to existing usage_tracking
      ALTER TABLE usage_tracking
        ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_billing_info_credits ON billing_info(credits_remaining) WHERE credits_remaining < 10;

      -- Function to auto-reset credits monthly
      CREATE OR REPLACE FUNCTION reset_monthly_credits()
      RETURNS void AS $$
      BEGIN
        UPDATE billing_info
        SET
          credits_remaining = credits_total,
          credits_reset_at = NOW() + INTERVAL '1 month'
        WHERE credits_reset_at < NOW()
          AND plan != 'enterprise';
      END;
      $$ LANGUAGE plpgsql;

      -- Create guest rate limit table (IP-based for non-logged users)
      CREATE TABLE IF NOT EXISTS guest_rate_limits (
        ip_address INET PRIMARY KEY,
        operation_count INTEGER DEFAULT 0,
        window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_guest_rate_limits_window ON guest_rate_limits(window_start);
    `,
        down: `
      DROP INDEX IF EXISTS idx_guest_rate_limits_window;
      DROP TABLE IF EXISTS guest_rate_limits CASCADE;

      DROP FUNCTION IF EXISTS reset_monthly_credits();

      DROP INDEX IF EXISTS idx_billing_info_credits;
      DROP INDEX IF EXISTS idx_credit_transactions_created_at;
      DROP INDEX IF EXISTS idx_credit_transactions_user_id;

      ALTER TABLE usage_tracking DROP COLUMN IF EXISTS credits_used;
      DROP TABLE IF EXISTS credit_transactions CASCADE;

      ALTER TABLE billing_info
        DROP COLUMN IF EXISTS credits_reset_at,
        DROP COLUMN IF EXISTS credits_total,
        DROP COLUMN IF EXISTS credits_remaining;
    `
    },
    {
    id: '007',
    name: 'add_authorization_codes_for_sso',
    timestamp: '2026-02-12T18:00:00.000Z',
    up: `
      -- Authorization codes table for OAuth-style SSO flow
      CREATE TABLE IF NOT EXISTS authorization_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(64) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        redirect_uri TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Index for quick code lookups
      CREATE INDEX IF NOT EXISTS idx_auth_codes_code ON authorization_codes(code) WHERE NOT used;
      CREATE INDEX IF NOT EXISTS idx_auth_codes_expires ON authorization_codes(expires_at) WHERE NOT used;
      CREATE INDEX IF NOT EXISTS idx_auth_codes_user_id ON authorization_codes(user_id);

      -- Auto-delete expired codes (cleanup function)
      CREATE OR REPLACE FUNCTION cleanup_expired_auth_codes()
      RETURNS void AS $$
      BEGIN
        DELETE FROM authorization_codes
        WHERE expires_at < NOW() - INTERVAL '1 hour';
      END;
      $$ LANGUAGE plpgsql;
    `,
    down: `
      DROP FUNCTION IF EXISTS cleanup_expired_auth_codes;
      DROP INDEX IF EXISTS idx_auth_codes_user_id;
      DROP INDEX IF EXISTS idx_auth_codes_expires;
      DROP INDEX IF EXISTS idx_auth_codes_code;
      DROP TABLE IF EXISTS authorization_codes CASCADE;
    `
    }
]

// Create migrations tracking table
async function createMigrationsTable(): Promise<void> {
    await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
}

// Get executed migrations
async function getExecutedMigrations(): Promise<string[]> {
    try {
        const result = await query('SELECT id FROM schema_migrations ORDER BY id')
        return result.rows.map((row: any) => row.id)
    } catch (error) {
        // Table doesn't exist yet, return empty array
        return []
    }
}

// Execute a single migration
async function executeMigration(migration: Migration): Promise<void> {
    try {
        console.log(`🔄 Running migration ${migration.id}: ${migration.name}`)

        // Execute the migration SQL
        await query(migration.up)

        // Record the migration as executed
        await query(
            'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
            [migration.id, migration.name]
        )

        console.log(`✅ Migration ${migration.id} completed successfully`)
    } catch (error) {
        console.error(`❌ Migration ${migration.id} failed:`, error)
        throw error
    }
}

// Rollback a single migration
async function rollbackMigration(migration: Migration): Promise<void> {
    try {
        console.log(`🔄 Rolling back migration ${migration.id}: ${migration.name}`)

        // Execute the rollback SQL
        await query(migration.down)

        // Remove the migration record
        await query('DELETE FROM schema_migrations WHERE id = $1', [migration.id])

        console.log(`✅ Migration ${migration.id} rolled back successfully`)
    } catch (error) {
        console.error(`❌ Rollback of migration ${migration.id} failed:`, error)
        throw error
    }
}

// Run all pending migrations
export async function runMigrations(): Promise<void> {
    try {
        console.log('🚀 Starting database migrations...')

        // Create migrations table if it doesn't exist
        await createMigrationsTable()

        // Get list of executed migrations
        const executedMigrations = await getExecutedMigrations()

        // Find pending migrations
        const pendingMigrations = migrations.filter(
            migration => !executedMigrations.includes(migration.id)
        )

        if (pendingMigrations.length === 0) {
            console.log('✅ No pending migrations found')
            return
        }

        console.log(`📋 Found ${pendingMigrations.length} pending migrations`)

        // Execute each pending migration
        for (const migration of pendingMigrations) {
            await executeMigration(migration)
        }

        console.log('🎉 All migrations completed successfully!')
    } catch (error) {
        console.error('💥 Migration failed:', error)
        throw error
    }
}

// Rollback the last migration
export async function rollbackLastMigration(): Promise<void> {
    try {
        console.log('🔄 Rolling back last migration...')

        // Get the last executed migration
        const result = await query(
            'SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1'
        )

        if (result.rows.length === 0) {
            console.log('ℹ️ No migrations to rollback')
            return
        }

        const lastMigrationId = result.rows[0].id
        const migration = migrations.find(m => m.id === lastMigrationId)

        if (!migration) {
            throw new Error(`Migration ${lastMigrationId} not found in migration files`)
        }

        await rollbackMigration(migration)
        console.log('✅ Last migration rolled back successfully!')
    } catch (error) {
        console.error('💥 Rollback failed:', error)
        throw error
    }
}

// Get migration status
export async function getMigrationStatus(): Promise<{
    executed: string[]
    pending: string[]
    total: number
}> {
    try {
        await createMigrationsTable()
        const executedMigrations = await getExecutedMigrations()
        const allMigrationIds = migrations.map(m => m.id)
        const pendingMigrations = allMigrationIds.filter(
            id => !executedMigrations.includes(id)
        )

        return {
            executed: executedMigrations,
            pending: pendingMigrations,
            total: migrations.length
        }
    } catch (error) {
        console.error('Error getting migration status:', error)
        throw error
    }
}

// Create a new migration file template
export function generateMigrationTemplate(name: string): string {
    const timestamp = new Date().toISOString()
    const id = String(migrations.length + 1).padStart(3, '0')

    return `{
  id: '${id}',
  name: '${name}',
  timestamp: '${timestamp}',
  up: \`
    -- Add your forward migration SQL here
    
  \`,
  down: \`
    -- Add your rollback migration SQL here
    
  \`
}`
}

// Export migrations for reference
export { migrations } 