-- Vega Career AI - Complete Database Schema
-- Based on Technical Documentation v1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    linkedin_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'starter', 'professional', 'business', 'enterprise'))
);

-- 2. Credit Accounts Table
CREATE TABLE credit_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    lifetime_purchased DECIMAL(10,2) DEFAULT 0.00,
    lifetime_consumed DECIMAL(10,2) DEFAULT 0.00,
    daily_free_credits_used INTEGER DEFAULT 0,
    daily_free_credits_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT positive_lifetime_purchased CHECK (lifetime_purchased >= 0),
    CONSTRAINT positive_lifetime_consumed CHECK (lifetime_consumed >= 0),
    CONSTRAINT valid_daily_free_credits CHECK (daily_free_credits_used >= 0 AND daily_free_credits_used <= 10)
);

-- 3. Credit Transactions Table
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    metadata JSONB,
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'consumption', 'daily_free', 'refund', 'bonus'))
);

-- 4. LLM Usage Table
CREATE TABLE llm_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES credit_transactions(id),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    credits_consumed DECIMAL(10,2) NOT NULL,
    request_id VARCHAR(255),
    response_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    query_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_provider CHECK (provider IN ('claude', 'perplexity', 'openai', 'gemini')),
    CONSTRAINT valid_status CHECK (status IN ('completed', 'failed', 'timeout', 'cancelled')),
    CONSTRAINT positive_tokens CHECK (prompt_tokens >= 0 AND completion_tokens >= 0 AND total_tokens >= 0),
    CONSTRAINT positive_credits CHECK (credits_consumed >= 0)
);

-- 5. Credit Packages Table
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    credits DECIMAL(10,2) NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_credits CHECK (credits > 0),
    CONSTRAINT positive_price CHECK (price_usd > 0)
);

-- 6. LLM Provider Config Table
CREATE TABLE llm_provider_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    credits_per_1k_tokens DECIMAL(6,4) NOT NULL,
    input_cost_per_1m_tokens DECIMAL(10,6) NOT NULL,
    output_cost_per_1m_tokens DECIMAL(10,6) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider, model),
    CONSTRAINT positive_credits_per_1k CHECK (credits_per_1k_tokens > 0),
    CONSTRAINT positive_input_cost CHECK (input_cost_per_1m_tokens >= 0),
    CONSTRAINT positive_output_cost CHECK (output_cost_per_1m_tokens >= 0)
);

-- 7. Rate Limiting Table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    identifier_type VARCHAR(20) NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_identifier_type CHECK (identifier_type IN ('user', 'ip')),
    CONSTRAINT positive_request_count CHECK (request_count >= 0)
);

-- 8. System Settings Table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_linkedin_id ON users(linkedin_id);
CREATE INDEX idx_credit_accounts_user_id ON credit_accounts(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_provider_model ON llm_usage(provider, model);
CREATE INDEX idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_ip_address ON rate_limits(ip_address);

-- Insert Default Credit Packages
INSERT INTO credit_packages (name, credits, price_usd, stripe_price_id, sort_order, description, features) VALUES
('Starter Pack', 100, 10.00, 'price_starter_100', 1, 'Perfect for getting started with AI career insights', 
 '["100 credits ($10 value)", "Basic career insights", "Email support", "Access to all models"]'::jsonb),
('Professional Pack', 500, 45.00, 'price_pro_500', 2, 'Great for regular career planning and development', 
 '["500 credits ($50 value)", "Advanced career analysis", "Priority support", "Model selection", "Usage analytics"]'::jsonb),
('Business Pack', 2000, 160.00, 'price_business_2000', 3, 'Best value for power users and teams', 
 '["2000 credits ($200 value)", "Unlimited basic questions", "Premium insights", "Team management", "API access"]'::jsonb),
('Enterprise Pack', 10000, 800.00, 'price_enterprise_10000', 4, 'Custom solution for large organizations', 
 '["10000 credits ($1000 value)", "Dedicated support", "Custom integrations", "SLA guarantee", "Volume discounts"]'::jsonb);

-- Insert LLM Provider Configurations
INSERT INTO llm_provider_configs (provider, model, credits_per_1k_tokens, input_cost_per_1m_tokens, output_cost_per_1m_tokens) VALUES
('claude', 'claude-3-sonnet', 0.100, 3.000000, 15.000000),
('claude', 'claude-3-opus', 0.500, 15.000000, 75.000000),
('claude', 'claude-3-haiku', 0.050, 0.250000, 1.250000),
('perplexity', 'sonar-pro', 0.050, 1.000000, 3.000000),
('perplexity', 'sonar-small', 0.025, 0.200000, 0.600000),
('openai', 'gpt-4-turbo', 0.300, 10.000000, 30.000000),
('openai', 'gpt-3.5-turbo', 0.050, 0.500000, 1.500000);

-- Insert System Settings
INSERT INTO system_settings (key, value, description) VALUES
('daily_free_credits', '10', 'Number of free credits per day for registered users'),
('anonymous_daily_free_credits', '5', 'Number of free credits per day for anonymous users'),
('rate_limit_registered_hourly', '100', 'Hourly rate limit for registered users'),
('rate_limit_anonymous_hourly', '10', 'Hourly rate limit for anonymous users'),
('credit_base_value_usd', '0.10', 'Base USD value per credit'),
('maintenance_mode', 'false', 'System maintenance mode flag');

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_accounts_updated_at BEFORE UPDATE ON credit_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_llm_provider_configs_updated_at BEFORE UPDATE ON llm_provider_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 