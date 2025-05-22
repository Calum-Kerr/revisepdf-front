import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with persistent session storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'supabase-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
  },
  // Add global error handler
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(error => {
        console.error('Supabase fetch error:', error);
        throw error;
      });
    },
  },
});

export type SubscriptionTier = 'free' | 'pay_per_use' | 'personal' | 'power_user' | 'heavy_user' | 'unlimited';

export interface UserProfile {
  id: number;
  user_id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  subscription_start_date: string;
  subscription_end_date: string;
  daily_files_used: number;
  daily_files_limit: number;
  monthly_files_used: number;
  monthly_files_limit: number;
  max_file_size_mb: number;
  max_batch_size: number;
  last_usage_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface FileOperation {
  id: number;
  user_id: string;
  operation_type: 'compress' | 'merge' | 'split' | 'convert';
  file_size_bytes: number;
  file_count: number;
  input_filename?: string;
  output_filename?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface OperationValidationResult {
  operation_id: number;
  is_valid: boolean;
  error_message: string | null;
  cost_cents: number;
}

export interface UserStats {
  subscription_tier: string;
  daily_files_used: number;
  daily_files_limit: number;
  monthly_files_used: number;
  monthly_files_limit: number;
  max_file_size_mb: number;
  max_batch_size: number;
  total_operations: number;
  total_processed_bytes: number;
  subscription_end_date: string;
  days_until_renewal: number;
}

export const getFileSizeLimit = (tier: SubscriptionTier): number => {
  switch (tier) {
    case 'free':
      return 10 * 1024 * 1024; // 10MB
    case 'pay_per_use':
      return 200 * 1024 * 1024; // 200MB
    case 'personal':
      return 25 * 1024 * 1024; // 25MB
    case 'power_user':
      return 100 * 1024 * 1024; // 100MB
    case 'heavy_user':
      return 500 * 1024 * 1024; // 500MB
    case 'unlimited':
      return 1024 * 1024 * 1024; // 1GB (effectively unlimited)
    default:
      return 10 * 1024 * 1024; // Default to free tier
  }
};

// Get max batch size based on subscription tier
export const getMaxBatchSize = (tier: SubscriptionTier): number => {
  switch (tier) {
    case 'free':
      return 1; // No batch processing
    case 'pay_per_use':
      return 20; // Up to 20 files
    case 'personal':
      return 10;
    case 'power_user':
      return 50;
    case 'heavy_user':
    case 'unlimited':
      return 999; // Effectively unlimited
    default:
      return 1; // Default to free tier
  }
};

export const getSubscriptionDisplayName = (tier: SubscriptionTier): string => {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pay_per_use':
      return 'Pay-Per-Use';
    case 'personal':
      return 'Personal';
    case 'power_user':
      return 'Power User';
    case 'heavy_user':
      return 'Heavy User';
    case 'unlimited':
      return 'Unlimited Personal';
    default:
      return 'Unknown';
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data as UserProfile;
};

export const createUserProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
  const newProfile = {
    user_id: userId,
    email,
    subscription_tier: 'free' as SubscriptionTier,
    // The database trigger will set the appropriate limits based on the subscription tier
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .insert([newProfile])
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    return null;
  }

  return data as UserProfile;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> => {
  console.log(`Updating user profile for user ${userId} with:`, updates);

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  console.log('User profile updated successfully:', data);
  return data as UserProfile;
};

export const updateUserSubscription = async (
  userId: string,
  tier: SubscriptionTier
): Promise<UserProfile | null> => {
  // The database trigger will automatically update the limits based on the tier
  return updateUserProfile(userId, {
    subscription_tier: tier,
    subscription_start_date: new Date().toISOString(),
    subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  });
};

/**
 * Records a file operation and updates the user's usage statistics
 * @param userId The user ID
 * @param operationType The type of operation (compress, merge, split, convert)
 * @param fileSize The size of the file in bytes
 * @param fileCount The number of files in the operation (for batch processing)
 * @param inputFilename Optional input filename
 * @param outputFilename Optional output filename
 * @returns The result of the operation validation
 */
export const recordFileOperation = async (
  userId: string,
  operationType: 'compress' | 'merge' | 'split' | 'convert',
  fileSize: number,
  fileCount: number = 1,
  inputFilename?: string,
  outputFilename?: string
): Promise<OperationValidationResult | null> => {
  console.log(`Recording file operation for user ${userId}: ${operationType}, size: ${fileSize} bytes, count: ${fileCount}`);

  try {
    // Call the database function to record the operation
    const { data, error } = await supabase.rpc('record_file_operation', {
      p_user_id: userId,
      p_operation_type: operationType,
      p_file_size_bytes: fileSize,
      p_file_count: fileCount,
      p_input_filename: inputFilename,
      p_output_filename: outputFilename
    });

    if (error) {
      console.error('Error recording file operation:', error);
      return null;
    }

    console.log('File operation recorded successfully:', data);
    return data as OperationValidationResult;
  } catch (error) {
    console.error('Error recording file operation:', error);
    return null;
  }
};

/**
 * Gets the user's current statistics including usage and limits
 * @param userId The user ID
 * @returns The user's statistics
 */
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const { data, error } = await supabase.rpc('get_user_stats', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting user stats:', error);
      return null;
    }

    console.log('User stats retrieved successfully:', data);
    return data as UserStats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
};

/**
 * DEPRECATED: Use recordFileOperation instead
 * This function is kept for backward compatibility
 * Updates the user's storage usage after processing a file
 * @param userId The user ID
 * @param fileSize The size of the processed file in bytes
 * @returns The updated user profile or null if the update failed
 */
export const updateUserStorageUsage = async (
  userId: string,
  fileSize: number
): Promise<UserProfile | null> => {
  console.log('DEPRECATED: Using updateUserStorageUsage. Please update to use recordFileOperation instead.');

  // Call the new function with default values
  const result = await recordFileOperation(userId, 'compress', fileSize);

  if (!result || !result.is_valid) {
    console.error('Operation validation failed:', result?.error_message);
    return null;
  }

  // Get the updated profile
  return getUserProfile(userId);
};

// Authentication functions
export const signUp = async (email: string, password: string) => {
  // Always use the production URL for email verification to avoid localhost redirects
  const productionUrl = 'https://revisepdf-app-779c79ba0815.herokuapp.com';
  const redirectUrl = `${productionUrl}/auth/callback?type=signup`;

  console.log('Using redirect URL for signup:', redirectUrl);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        email: email,
      },
    },
  });

  if (error) {
    console.error('Error signing up:', error);
    return { user: null, error };
  }

  // Check if email confirmation is required
  const isEmailConfirmationRequired = !data.session;

  if (data.user) {
    // Create a user profile
    await createUserProfile(data.user.id, email);

    // Log the verification status
    console.log('Email confirmation required:', isEmailConfirmationRequired);
    console.log('User ID:', data.user.id);
    console.log('Email confirmation sent to:', email);
  }

  return {
    user: data.user,
    session: data.session,
    isEmailConfirmationRequired,
    error: null
  };
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log('Attempting to sign in with email:', email);

    // First, clear any existing sessions to prevent conflicts
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('Error clearing existing session before sign in:', signOutError);
      // Continue with sign in attempt even if this fails
    }

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signIn error:', error);
      return { session: null, user: null, error };
    }

    if (!data.session) {
      console.error('No session returned from signInWithPassword');
      return {
        session: null,
        user: null,
        error: new Error('Authentication failed. Please try again.')
      };
    }

    console.log('Sign in successful, got session with user ID:', data.user.id);

    // Verify the session is valid and explicitly set it
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Error setting session after sign in:', sessionError);
        // Continue with the original session
      } else if (sessionData.session) {
        console.log('Session explicitly set and verified');

        // Set a cookie to help with session persistence
        if (typeof document !== 'undefined') {
          document.cookie = `supabase-auth-session-exists=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }

        return { session: sessionData.session, user: sessionData.user, error: null };
      }
    } catch (sessionSetError) {
      console.error('Unexpected error setting session:', sessionSetError);
      // Continue with the original session
    }

    return { session: data.session, user: data.user, error: null };
  } catch (err) {
    console.error('Unexpected error during signIn:', err);
    return {
      session: null,
      user: null,
      error: new Error('An unexpected error occurred. Please try again.')
    };
  }
};

export const signInWithGoogle = async () => {
  // Always use the production URL for OAuth to avoid localhost redirects
  const productionUrl = 'https://revisepdf-app-779c79ba0815.herokuapp.com';
  const redirectUrl = `${productionUrl}/auth/callback`;

  console.log('Using redirect URL for Google sign-in:', redirectUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { data, error };
};

export const signOut = async () => {
  try {
    console.log('Attempting to sign out...');

    // Clear any local storage items related to authentication
    localStorage.removeItem('supabase-auth-token');
    localStorage.removeItem('supabase.auth.token');

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (error) {
      console.error('Error signing out from Supabase:', error);
      return { error };
    }

    console.log('Successfully signed out');
    return { error: null };
  } catch (err) {
    console.error('Unexpected error during sign out:', err);
    return { error: new Error('Failed to sign out. Please try again.') };
  }
};

export const resetPassword = async (email: string) => {
  try {
    console.log('Attempting to send password reset email to:', email);

    // Always use the production URL for password reset to avoid localhost redirects
    const productionUrl = 'https://revisepdf-app-779c79ba0815.herokuapp.com';
    const redirectUrl = `${productionUrl}/auth/callback?type=recovery`;

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return { error };
    }

    console.log('Password reset email sent successfully');
    return { error: null };
  } catch (err) {
    console.error('Unexpected error during password reset:', err);
    return { error: new Error('Failed to send password reset email. Please try again.') };
  }
};





// DEPRECATED: Update user storage usage - now calls recordFileOperation
export const updateUserStorageUsage = async (userId: string, fileSize: number): Promise<UserProfile | null> => {
  console.log('DEPRECATED: Using updateUserStorageUsage. Please update to use recordFileOperation instead.');

  // Call the new function with default values
  const result = await recordFileOperation(userId, 'compress', fileSize);

  if (!result || !result.is_valid) {
    console.error('Operation validation failed:', result?.error_message);
    return null;
  }

  // Get the updated profile
  return getUserProfile(userId);
};

export const getCurrentUser = async () => {
  console.log('Getting current user and profile...');

  try {
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return { user: null, session: null, error };
    }

    if (!session) {
      console.log('No active session found');
      return { user: null, session: null, error: null };
    }

    console.log('Active session found for user:', session.user.id);

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return { user: null, session: null, error: userError };
    }

    if (!user) {
      console.log('No user found for session');
      return { user: null, session: null, error: new Error('No user found for session') };
    }

    // Get the user profile directly from the database to ensure we have the latest data
    console.log('Fetching profile for user:', user.id);

    // First try the user_profiles table (new schema)
    let { data, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log('No profile found in user_profiles, trying profiles table (legacy)');
      // Fall back to the profiles table (old schema)
      const { data: legacyData, error: legacyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (legacyError) {
        console.error('Error fetching profile from both tables:', profileError, legacyError);
        return { user, session, profile: null, error: profileError };
      }

      data = legacyData;
      profileError = null;
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { user, session, profile: null, error: profileError };
    }

    if (!data) {
      console.log('No profile found for user:', user.id);
      return { user, session, profile: null, error: new Error('No profile found') };
    }

    console.log('Profile fetched successfully:', data);
    const profile = data as UserProfile;

    return { user, session, profile, error: null };
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return { user: null, session: null, profile: null, error };
  }
};
