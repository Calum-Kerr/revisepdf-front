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
  },
});

export type SubscriptionTier = 'free' | 'basic' | 'premium';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  subscription_tier: SubscriptionTier;
  file_size_limit: number;
  usage: number;
  created_at: string;
  updated_at: string;
}

export const getFileSizeLimit = (tier: SubscriptionTier): number => {
  switch (tier) {
    case 'free':
      return 5 * 1024 * 1024; // 5MB
    case 'basic':
      return 20 * 1024 * 1024; // 20MB
    case 'premium':
      return 100 * 1024 * 1024; // 100MB
    default:
      return 5 * 1024 * 1024; // Default to free tier
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
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
    file_size_limit: getFileSizeLimit('free'),
    usage: 0,
  };

  const { data, error } = await supabase
    .from('profiles')
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
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data as UserProfile;
};

export const updateUserSubscription = async (
  userId: string,
  tier: SubscriptionTier
): Promise<UserProfile | null> => {
  const fileLimit = getFileSizeLimit(tier);

  return updateUserProfile(userId, {
    subscription_tier: tier,
    file_size_limit: fileLimit,
  });
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

    // Verify the session is valid
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

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

export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return { user: null, session: null, error };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, session: null, error: userError };
  }

  // Get the user profile
  const profile = await getUserProfile(user.id);

  return { user, session, profile, error: null };
};
