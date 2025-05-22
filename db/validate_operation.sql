-- Create function to validate file operations against user limits
CREATE OR REPLACE FUNCTION validate_file_operation(
  p_user_id UUID,
  p_operation_type operation_type_enum,
  p_file_size_bytes BIGINT,
  p_file_count INTEGER DEFAULT 1
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  cost_cents INTEGER -- For pay-per-use pricing
) AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
  v_file_size_mb INTEGER;
  v_batch_cost_cents INTEGER := 0;
  v_size_cost_cents INTEGER := 0;
  v_total_cost_cents INTEGER := 0;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User profile not found', 0;
    RETURN;
  END IF;
  
  -- Reset daily usage if needed
  IF v_profile.last_usage_reset_date < CURRENT_DATE THEN
    UPDATE user_profiles SET 
      daily_files_used = 0,
      last_usage_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id
    RETURNING * INTO v_profile;
  END IF;
  
  -- Convert bytes to MB for easier comparison
  v_file_size_mb := p_file_size_bytes / (1024 * 1024);
  
  -- Check file size limit
  IF v_file_size_mb > v_profile.max_file_size_mb THEN
    RETURN QUERY SELECT 
      false, 
      'File size exceeds the limit of ' || v_profile.max_file_size_mb || 'MB for your subscription tier',
      0;
    RETURN;
  END IF;
  
  -- Check batch size limit
  IF p_file_count > v_profile.max_batch_size THEN
    RETURN QUERY SELECT 
      false, 
      'Batch size exceeds the limit of ' || v_profile.max_batch_size || ' files for your subscription tier',
      0;
    RETURN;
  END IF;
  
  -- Handle different subscription tiers
  CASE v_profile.subscription_tier
    -- Free tier: Check daily file limit
    WHEN 'free' THEN
      IF v_profile.daily_files_used + p_file_count > v_profile.daily_files_limit THEN
        RETURN QUERY SELECT 
          false, 
          'Daily file limit of ' || v_profile.daily_files_limit || ' files exceeded for free tier',
          0;
        RETURN;
      END IF;
      
      -- Update usage counter
      UPDATE user_profiles SET 
        daily_files_used = daily_files_used + p_file_count
      WHERE user_id = p_user_id;
      
      RETURN QUERY SELECT true, NULL::TEXT, 0;
      
    -- Pay-per-use tier: Calculate cost
    WHEN 'pay_per_use' THEN
      -- Calculate size-based cost: $0.10 per 10MB increment, capped at $2.00
      v_size_cost_cents := LEAST(CEIL(v_file_size_mb / 10.0) * 10, 200);
      
      -- Calculate batch processing cost: $0.05 per additional file, capped at $1.00
      IF p_file_count > 1 THEN
        v_batch_cost_cents := LEAST((p_file_count - 1) * 5, 100);
      END IF;
      
      v_total_cost_cents := v_size_cost_cents + v_batch_cost_cents;
      
      -- No need to update usage counters for pay-per-use
      RETURN QUERY SELECT true, NULL::TEXT, v_total_cost_cents;
      
    -- Subscription tiers: Check monthly file limit
    WHEN 'personal', 'power_user', 'heavy_user' THEN
      IF v_profile.monthly_files_used + p_file_count > v_profile.monthly_files_limit THEN
        RETURN QUERY SELECT 
          false, 
          'Monthly file limit of ' || v_profile.monthly_files_limit || ' files exceeded for your subscription',
          0;
        RETURN;
      END IF;
      
      -- Update usage counter
      UPDATE user_profiles SET 
        monthly_files_used = monthly_files_used + p_file_count
      WHERE user_id = p_user_id;
      
      RETURN QUERY SELECT true, NULL::TEXT, 0;
      
    -- Unlimited tier: No limits to check
    WHEN 'unlimited' THEN
      RETURN QUERY SELECT true, NULL::TEXT, 0;
      
    -- Default case
    ELSE
      RETURN QUERY SELECT false, 'Unknown subscription tier', 0;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
