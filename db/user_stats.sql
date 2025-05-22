-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  subscription_tier TEXT,
  daily_files_used INTEGER,
  daily_files_limit INTEGER,
  monthly_files_used INTEGER,
  monthly_files_limit INTEGER,
  max_file_size_mb INTEGER,
  max_batch_size INTEGER,
  total_operations INTEGER,
  total_processed_bytes BIGINT,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  days_until_renewal INTEGER
) AS $$
DECLARE
  v_profile user_profiles%ROWTYPE;
BEGIN
  -- Get user profile and reset daily usage if needed
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
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
  
  -- Return user stats
  RETURN QUERY
  SELECT
    v_profile.subscription_tier::TEXT,
    v_profile.daily_files_used,
    v_profile.daily_files_limit,
    v_profile.monthly_files_used,
    v_profile.monthly_files_limit,
    v_profile.max_file_size_mb,
    v_profile.max_batch_size,
    (SELECT COUNT(*) FROM file_operations WHERE user_id = p_user_id)::INTEGER,
    (SELECT COALESCE(SUM(file_size_bytes), 0) FROM file_operations WHERE user_id = p_user_id)::BIGINT,
    v_profile.subscription_end_date,
    (v_profile.subscription_end_date::DATE - CURRENT_DATE)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
