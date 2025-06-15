-- Vega Career AI - Database Functions
-- Core functions for credit management and LLM usage tracking

-- 1. Function to create user account with credit account
CREATE OR REPLACE FUNCTION create_user_account(
    p_email VARCHAR(255),
    p_linkedin_id VARCHAR(255) DEFAULT NULL,
    p_full_name VARCHAR(255) DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_account_id UUID;
BEGIN
    -- Insert user
    INSERT INTO users (email, linkedin_id, full_name, avatar_url)
    VALUES (p_email, p_linkedin_id, p_full_name, p_avatar_url)
    RETURNING id INTO v_user_id;
    
    -- Create credit account
    INSERT INTO credit_accounts (user_id)
    VALUES (v_user_id)
    RETURNING id INTO v_account_id;
    
    RETURN json_build_object(
        'user_id', v_user_id,
        'account_id', v_account_id,
        'success', true
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User already exists'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 2. Function to reset daily free credits
CREATE OR REPLACE FUNCTION reset_daily_free_credits()
RETURNS INTEGER AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    UPDATE credit_accounts 
    SET 
        daily_free_credits_used = 0,
        daily_free_credits_reset_at = NOW(),
        updated_at = NOW()
    WHERE daily_free_credits_reset_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    
    RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get user credit balance
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_account RECORD;
    v_daily_free_remaining INTEGER;
BEGIN
    -- Get account info
    SELECT * INTO v_account
    FROM credit_accounts
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credit account not found'
        );
    END IF;
    
    -- Reset daily free credits if needed
    IF v_account.daily_free_credits_reset_at < NOW() - INTERVAL '1 day' THEN
        UPDATE credit_accounts 
        SET 
            daily_free_credits_used = 0,
            daily_free_credits_reset_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        v_account.daily_free_credits_used := 0;
    END IF;
    
    -- Calculate remaining free credits
    v_daily_free_remaining := 10 - v_account.daily_free_credits_used;
    
    RETURN json_build_object(
        'success', true,
        'balance', v_account.balance,
        'daily_free_credits_remaining', GREATEST(0, v_daily_free_remaining),
        'lifetime_purchased', v_account.lifetime_purchased,
        'lifetime_consumed', v_account.lifetime_consumed,
        'last_reset', v_account.daily_free_credits_reset_at
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Function to calculate credits required for LLM usage
CREATE OR REPLACE FUNCTION calculate_credits_required(
    p_provider VARCHAR(50),
    p_model VARCHAR(100),
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_config RECORD;
    v_input_ratio DECIMAL(10,6);
    v_output_ratio DECIMAL(10,6);
    v_total_tokens INTEGER;
    v_weighted_tokens DECIMAL(10,2);
    v_credits_required DECIMAL(10,2);
BEGIN
    -- Get provider configuration
    SELECT * INTO v_config
    FROM llm_provider_configs
    WHERE provider = p_provider AND model = p_model AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provider configuration not found for % %', p_provider, p_model;
    END IF;
    
    -- Calculate weighted token cost based on input/output pricing
    v_input_ratio := v_config.input_cost_per_1m_tokens / 
        (v_config.input_cost_per_1m_tokens + v_config.output_cost_per_1m_tokens);
    v_output_ratio := 1 - v_input_ratio;
    
    v_total_tokens := p_prompt_tokens + p_completion_tokens;
    v_weighted_tokens := (p_prompt_tokens * v_input_ratio) + (p_completion_tokens * v_output_ratio);
    
    -- Calculate credits required
    v_credits_required := (v_weighted_tokens / 1000) * v_config.credits_per_1k_tokens;
    
    -- Round up to nearest cent
    RETURN CEIL(v_credits_required * 100) / 100;
END;
$$ LANGUAGE plpgsql;

-- 5. Main function to consume credits
CREATE OR REPLACE FUNCTION consume_credits(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_usage_data JSONB
) RETURNS JSON AS $$
DECLARE
    v_account RECORD;
    v_new_balance DECIMAL(10,2);
    v_transaction_id UUID;
    v_usage_id UUID;
    v_use_free_credits BOOLEAN := FALSE;
    v_daily_free_remaining INTEGER;
BEGIN
    -- Get current account state
    SELECT * INTO v_account
    FROM credit_accounts
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credit account not found'
        );
    END IF;
    
    -- Reset daily free credits if needed
    IF v_account.daily_free_credits_reset_at < NOW() - INTERVAL '1 day' THEN
        UPDATE credit_accounts 
        SET 
            daily_free_credits_used = 0,
            daily_free_credits_reset_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        v_account.daily_free_credits_used := 0;
    END IF;
    
    v_daily_free_remaining := 10 - v_account.daily_free_credits_used;
    
    -- Determine if we should use free credits
    IF v_account.balance < p_amount AND v_daily_free_remaining > 0 THEN
        v_use_free_credits := TRUE;
    ELSIF v_account.balance < p_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_account.balance,
            'daily_free_remaining', v_daily_free_remaining
        );
    END IF;
    
    -- Begin transaction
    BEGIN
        IF v_use_free_credits THEN
            -- Use free credit
            UPDATE credit_accounts
            SET 
                daily_free_credits_used = daily_free_credits_used + 1,
                lifetime_consumed = lifetime_consumed + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            v_new_balance := v_account.balance;
            
            -- Log free credit transaction
            INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, metadata)
            VALUES (p_user_id, 'daily_free', p_amount, v_new_balance, p_description, p_usage_data)
            RETURNING id INTO v_transaction_id;
        ELSE
            -- Use paid credits
            v_new_balance := v_account.balance - p_amount;
            
            UPDATE credit_accounts
            SET 
                balance = v_new_balance,
                lifetime_consumed = lifetime_consumed + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            -- Log consumption transaction
            INSERT INTO credit_transactions (user_id, transaction_type, amount, balance_after, description, metadata)
            VALUES (p_user_id, 'consumption', -p_amount, v_new_balance, p_description, p_usage_data)
            RETURNING id INTO v_transaction_id;
        END IF;
        
        -- Log LLM usage if provided
        IF p_usage_data IS NOT NULL THEN
            INSERT INTO llm_usage (
                user_id, 
                transaction_id, 
                provider, 
                model, 
                prompt_tokens, 
                completion_tokens, 
                total_tokens, 
                credits_consumed,
                request_id,
                response_time_ms,
                status,
                query_type
            ) VALUES (
                p_user_id,
                v_transaction_id,
                (p_usage_data->>'provider')::VARCHAR,
                (p_usage_data->>'model')::VARCHAR,
                COALESCE((p_usage_data->>'prompt_tokens')::INTEGER, 0),
                COALESCE((p_usage_data->>'completion_tokens')::INTEGER, 0),
                COALESCE((p_usage_data->>'total_tokens')::INTEGER, 0),
                p_amount,
                p_usage_data->>'request_id',
                (p_usage_data->>'response_time_ms')::INTEGER,
                COALESCE(p_usage_data->>'status', 'completed'),
                p_usage_data->>'query_type'
            ) RETURNING id INTO v_usage_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM
            );
    END;
    
    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'used_free_credit', v_use_free_credits,
        'transaction_id', v_transaction_id,
        'usage_id', v_usage_id,
        'daily_free_remaining', GREATEST(0, v_daily_free_remaining - CASE WHEN v_use_free_credits THEN 1 ELSE 0 END)
    );
END;
$$ LANGUAGE plpgsql;

-- 6. Function to add credits (purchase)
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT 'Credit purchase',
    p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_account RECORD;
    v_new_balance DECIMAL(10,2);
    v_transaction_id UUID;
BEGIN
    -- Get current account state
    SELECT * INTO v_account
    FROM credit_accounts
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Credit account not found'
        );
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_account.balance + p_amount;
    
    -- Begin transaction
    BEGIN
        -- Update account
        UPDATE credit_accounts
        SET 
            balance = v_new_balance,
            lifetime_purchased = lifetime_purchased + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Log purchase transaction
        INSERT INTO credit_transactions (
            user_id, 
            transaction_type, 
            amount, 
            balance_after, 
            description,
            stripe_payment_intent_id
        ) VALUES (
            p_user_id, 
            'purchase', 
            p_amount, 
            v_new_balance, 
            p_description,
            p_stripe_payment_intent_id
        ) RETURNING id INTO v_transaction_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM
            );
    END;
    
    RETURN json_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id,
        'amount_added', p_amount
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_identifier_type VARCHAR(20);
    v_limit_record RECORD;
    v_hourly_limit INTEGER;
    v_current_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determine identifier type and limits
    IF p_user_id IS NOT NULL THEN
        v_identifier_type := 'user';
        v_hourly_limit := 100; -- Registered user limit
    ELSE
        v_identifier_type := 'ip';
        v_hourly_limit := 10; -- Anonymous user limit
    END IF;
    
    v_window_start := date_trunc('hour', NOW());
    
    -- Get or create rate limit record
    IF v_identifier_type = 'user' THEN
        SELECT * INTO v_limit_record
        FROM rate_limits
        WHERE user_id = p_user_id 
        AND window_start = v_window_start;
    ELSE
        SELECT * INTO v_limit_record
        FROM rate_limits
        WHERE ip_address = p_ip_address 
        AND window_start = v_window_start;
    END IF;
    
    IF FOUND THEN
        v_current_count := v_limit_record.request_count;
    ELSE
        v_current_count := 0;
    END IF;
    
    -- Check if limit exceeded
    IF v_current_count >= v_hourly_limit THEN
        RETURN json_build_object(
            'allowed', false,
            'current_count', v_current_count,
            'limit', v_hourly_limit,
            'reset_time', v_window_start + INTERVAL '1 hour',
            'identifier_type', v_identifier_type
        );
    END IF;
    
    RETURN json_build_object(
        'allowed', true,
        'current_count', v_current_count,
        'limit', v_hourly_limit,
        'remaining', v_hourly_limit - v_current_count,
        'reset_time', v_window_start + INTERVAL '1 hour',
        'identifier_type', v_identifier_type
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Function to record rate limit usage
CREATE OR REPLACE FUNCTION record_rate_limit_usage(
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_identifier_type VARCHAR(20);
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Determine identifier type
    IF p_user_id IS NOT NULL THEN
        v_identifier_type := 'user';
    ELSE
        v_identifier_type := 'ip';
    END IF;
    
    v_window_start := date_trunc('hour', NOW());
    
    -- Insert or update rate limit record
    IF v_identifier_type = 'user' THEN
        INSERT INTO rate_limits (user_id, identifier_type, request_count, window_start, window_end)
        VALUES (p_user_id, v_identifier_type, 1, v_window_start, v_window_start + INTERVAL '1 hour')
        ON CONFLICT (user_id, window_start) 
        DO UPDATE SET 
            request_count = rate_limits.request_count + 1,
            created_at = NOW();
    ELSE
        INSERT INTO rate_limits (ip_address, identifier_type, request_count, window_start, window_end)
        VALUES (p_ip_address, v_identifier_type, 1, v_window_start, v_window_start + INTERVAL '1 hour')
        ON CONFLICT (ip_address, window_start) 
        DO UPDATE SET 
            request_count = rate_limits.request_count + 1,
            created_at = NOW();
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to get usage analytics
CREATE OR REPLACE FUNCTION get_usage_analytics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_user_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_total_requests INTEGER;
    v_total_credits DECIMAL(10,2);
    v_total_tokens BIGINT;
    v_avg_response_time DECIMAL(10,2);
    v_provider_stats JSON;
    v_daily_stats JSON;
BEGIN
    -- Base query conditions
    WITH usage_data AS (
        SELECT *
        FROM llm_usage
        WHERE created_at >= p_start_date
        AND created_at <= p_end_date + INTERVAL '1 day'
        AND (p_user_id IS NULL OR user_id = p_user_id)
    )
    SELECT 
        COUNT(*),
        COALESCE(SUM(credits_consumed), 0),
        COALESCE(SUM(total_tokens), 0),
        COALESCE(AVG(response_time_ms), 0)
    INTO v_total_requests, v_total_credits, v_total_tokens, v_avg_response_time
    FROM usage_data;
    
    -- Provider statistics
    SELECT json_agg(
        json_build_object(
            'provider', provider,
            'model', model,
            'requests', request_count,
            'credits_consumed', credits_consumed,
            'avg_tokens', avg_tokens
        )
    ) INTO v_provider_stats
    FROM (
        SELECT 
            provider,
            model,
            COUNT(*) as request_count,
            SUM(credits_consumed) as credits_consumed,
            AVG(total_tokens) as avg_tokens
        FROM llm_usage
        WHERE created_at >= p_start_date
        AND created_at <= p_end_date + INTERVAL '1 day'
        AND (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY provider, model
        ORDER BY request_count DESC
    ) provider_data;
    
    -- Daily statistics
    SELECT json_agg(
        json_build_object(
            'date', usage_date,
            'requests', daily_requests,
            'credits', daily_credits,
            'tokens', daily_tokens
        ) ORDER BY usage_date
    ) INTO v_daily_stats
    FROM (
        SELECT 
            DATE(created_at) as usage_date,
            COUNT(*) as daily_requests,
            SUM(credits_consumed) as daily_credits,
            SUM(total_tokens) as daily_tokens
        FROM llm_usage
        WHERE created_at >= p_start_date
        AND created_at <= p_end_date + INTERVAL '1 day'
        AND (p_user_id IS NULL OR user_id = p_user_id)
        GROUP BY DATE(created_at)
    ) daily_data;
    
    RETURN json_build_object(
        'period', json_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'totals', json_build_object(
            'requests', v_total_requests,
            'credits_consumed', v_total_credits,
            'total_tokens', v_total_tokens,
            'avg_response_time_ms', ROUND(v_avg_response_time, 2)
        ),
        'provider_stats', COALESCE(v_provider_stats, '[]'::json),
        'daily_stats', COALESCE(v_daily_stats, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Cleanup function for old records
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_temp_count INTEGER;
BEGIN
    -- Clean up old rate limit records (older than 7 days)
    DELETE FROM rate_limits 
    WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    -- Clean up old LLM usage records (older than 1 year, keep only aggregated data)
    DELETE FROM llm_usage 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND status = 'completed';
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_deleted_count := v_deleted_count + v_temp_count;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql; 