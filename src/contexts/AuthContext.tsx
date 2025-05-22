'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  signIn,
  signUp,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  UserProfile
} from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);

        // First check if we have a session in localStorage
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          console.log('Found existing session:', existingSession.user.id);

          // Verify the session is valid by refreshing it
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // Clear invalid session
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setProfile(null);
          } else if (refreshData.session) {
            console.log('Session refreshed successfully');
            setSession(refreshData.session);
            setUser(refreshData.user);

            // Fetch the user profile
            const { profile } = await getCurrentUser();
            setProfile(profile || null);

            // Ensure the session is stored in localStorage
            localStorage.setItem('supabase-auth-token', JSON.stringify({
              access_token: refreshData.session.access_token,
              refresh_token: refreshData.session.refresh_token,
            }));
          }
        } else {
          console.log('No existing session found');
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear state on error
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in or token refreshed');
          setSession(session);
          setUser(session?.user || null);

          if (session?.user) {
            // Fetch the user profile
            const { profile } = await getCurrentUser();
            setProfile(profile || null);

            // Ensure the session is stored in localStorage
            localStorage.setItem('supabase-auth-token', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          setSession(null);
          setProfile(null);

          // Clear localStorage
          localStorage.removeItem('supabase-auth-token');
        }

        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting to sign in with email:', email);

      const { session, user, error } = await signIn(email, password);

      if (error) {
        console.error('Sign in error:', error);
        toast.error(error.message || 'Failed to sign in. Please check your credentials.');
        return;
      }

      if (!user || !session) {
        console.error('No user or session returned from signIn');
        toast.error('Authentication failed. Please try again.');
        return;
      }

      console.log('Sign in successful, user ID:', user.id);
      console.log('Session:', session.access_token ? 'Valid access token' : 'No access token');

      // Set the user and session state
      setUser(user);
      setSession(session);

      try {
        // Get the user profile
        const { profile } = await getCurrentUser();
        setProfile(profile);
        console.log('User profile loaded:', profile?.id);
      } catch (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue even if profile fetch fails
      }

      // Explicitly set the session in localStorage to ensure persistence
      localStorage.setItem('supabase-auth-token', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }));

      toast.success('Logged in successfully!');

      // Force a redirect to the dashboard to ensure the user is redirected
      console.log('Redirecting to dashboard...');

      // Use window.location for a hard redirect instead of router.push
      // This ensures a full page reload and proper session recognition
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Unexpected error during sign in:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user, error, isEmailConfirmationRequired } = await signUp(email, password);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (user) {
        if (isEmailConfirmationRequired) {
          toast.success('Account created! Please check your email to confirm your account.', {
            duration: 6000 // Show for 6 seconds
          });

          // Show a more detailed message
          setTimeout(() => {
            toast('Click the verification link in your email to complete registration.', {
              icon: '📧',
              duration: 5000
            });
          }, 1000);

          router.push('/login');
        } else {
          // If email confirmation is not required, set the user and session
          setUser(user);
          toast.success('Account created successfully!');
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const { error } = await signInWithGoogle();

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.error('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Handling sign out request');

      // First, clear the local state
      setUser(null);
      setSession(null);
      setProfile(null);

      // Then sign out from Supabase
      const { error } = await signOut();

      if (error) {
        console.error('Error during sign out:', error);
        toast.error(error.message || 'Failed to sign out. Please try again.');
        return;
      }

      // Clear any additional auth-related items from localStorage
      try {
        localStorage.removeItem('supabase-auth-token');
        localStorage.removeItem('supabase.auth.token');

        // Clear any cookies related to authentication
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.trim().split('=');
          if (name.includes('supabase') || name.includes('auth')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          }
        });
      } catch (e) {
        console.error('Error clearing local storage or cookies:', e);
      }

      toast.success('Logged out successfully!');

      // Force a page reload to ensure all auth state is cleared
      window.location.href = '/';
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
