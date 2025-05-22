-- Drop existing tables if they exist
DROP TABLE IF EXISTS file_operations;
DROP TYPE IF EXISTS subscription_tier_enum;
DROP TYPE IF EXISTS operation_type_enum;

-- Create enum for subscription tiers
CREATE TYPE subscription_tier_enum AS ENUM (
  'free',
  'pay_per_use',
  'personal',
  'power_user',
  'heavy_user',
  'unlimited'
);

-- Create enum for operation types
CREATE TYPE operation_type_enum AS ENUM (
  'compress',
  'merge',
  'split',
  'convert'
);

-- Update user_profiles table
ALTER TABLE user_profiles 
  DROP COLUMN IF EXISTS account_type,
  DROP COLUMN IF EXISTS storage_used,
  DROP COLUMN IF EXISTS storage_limit;

-- Add new columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN subscription_tier subscription_tier_enum DEFAULT 'free',
  ADD COLUMN subscription_start_date timestamp with time zone DEFAULT now(),
  ADD COLUMN subscription_end_date timestamp with time zone DEFAULT now() + interval '100 years',
  ADD COLUMN daily_files_used integer DEFAULT 0,
  ADD COLUMN daily_files_limit integer DEFAULT 5,
  ADD COLUMN monthly_files_used integer DEFAULT 0,
  ADD COLUMN monthly_files_limit integer DEFAULT 0,
  ADD COLUMN max_file_size_mb integer DEFAULT 10,
  ADD COLUMN max_batch_size integer DEFAULT 1,
  ADD COLUMN last_usage_reset_date date DEFAULT CURRENT_DATE;

-- Create file_operations table to track individual operations
CREATE TABLE IF NOT EXISTS file_operations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type operation_type_enum NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Additional metadata
  input_filename TEXT,
  output_filename TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_file_operations_user_id ON file_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_file_operations_created_at ON file_operations(created_at);

-- Create function to get subscription tier limits
CREATE OR REPLACE FUNCTION get_subscription_limits(tier subscription_tier_enum)
RETURNS TABLE (
  daily_files_limit INTEGER,
  monthly_files_limit INTEGER,
  max_file_size_mb INTEGER,
  max_batch_size INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE tier
      WHEN 'free' THEN 5
      WHEN 'pay_per_use' THEN 999999 -- Unlimited daily files for pay-per-use
      WHEN 'personal' THEN 999999 -- No daily limit, only monthly
      WHEN 'power_user' THEN 999999
      WHEN 'heavy_user' THEN 999999
      WHEN 'unlimited' THEN 999999
    END AS daily_files_limit,
    
    CASE tier
      WHEN 'free' THEN 0 -- No monthly limit for free tier (uses daily)
      WHEN 'pay_per_use' THEN 0 -- No monthly limit for pay-per-use
      WHEN 'personal' THEN 100
      WHEN 'power_user' THEN 500
      WHEN 'heavy_user' THEN 1500
      WHEN 'unlimited' THEN 999999
    END AS monthly_files_limit,
    
    CASE tier
      WHEN 'free' THEN 10
      WHEN 'pay_per_use' THEN 200 -- Cap at 200MB per file
      WHEN 'personal' THEN 25
      WHEN 'power_user' THEN 100
      WHEN 'heavy_user' THEN 500
      WHEN 'unlimited' THEN 999999
    END AS max_file_size_mb,
    
    CASE tier
      WHEN 'free' THEN 1
      WHEN 'pay_per_use' THEN 20 -- Cap at 20 files per batch
      WHEN 'personal' THEN 10
      WHEN 'power_user' THEN 50
      WHEN 'heavy_user' THEN 999999
      WHEN 'unlimited' THEN 999999
    END AS max_batch_size;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user limits based on their subscription tier
CREATE OR REPLACE FUNCTION update_user_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
  SELECT * FROM get_subscription_limits(NEW.subscription_tier) INTO 
    NEW.daily_files_limit, 
    NEW.monthly_files_limit, 
    NEW.max_file_size_mb, 
    NEW.max_batch_size;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update limits when subscription tier changes
CREATE TRIGGER update_subscription_limits_trigger
BEFORE INSERT OR UPDATE OF subscription_tier ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_subscription_limits();

-- Create function to reset daily usage counters
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_usage_reset_date < CURRENT_DATE THEN
    NEW.daily_files_used := 0;
    NEW.last_usage_reset_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset daily usage when accessing profile
CREATE TRIGGER reset_daily_usage_trigger
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION reset_daily_usage();

-- Create function to reset monthly usage on subscription renewal
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- If it's a new month since the subscription started
  IF (EXTRACT(YEAR FROM NEW.subscription_start_date) != EXTRACT(YEAR FROM OLD.subscription_start_date) OR
      EXTRACT(MONTH FROM NEW.subscription_start_date) != EXTRACT(MONTH FROM OLD.subscription_start_date)) THEN
    NEW.monthly_files_used := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to reset monthly usage on subscription renewal
CREATE TRIGGER reset_monthly_usage_trigger
BEFORE UPDATE OF subscription_start_date ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION reset_monthly_usage();

-- Create RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_operations ENABLE ROW LEVEL SECURITY;

-- Users can view their own profiles
CREATE POLICY user_profiles_select_policy ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profiles
CREATE POLICY user_profiles_update_policy ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their own file operations
CREATE POLICY file_operations_select_policy ON file_operations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own file operations
CREATE POLICY file_operations_insert_policy ON file_operations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY service_role_user_profiles_policy ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_file_operations_policy ON file_operations
  FOR ALL USING (auth.role() = 'service_role');
