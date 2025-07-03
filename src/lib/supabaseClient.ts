import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Timeout for Supabase operations (in milliseconds)
const SUPABASE_TIMEOUT_MS = 15000; // 15 seconds

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { 
    hasUrl: !!supabaseUrl, 
    hasAnonKey: !!supabaseAnonKey 
  });
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Disable session persistence to prevent timeout issues in webcontainer
    detectSessionInUrl: true
  }
});

// Log Supabase initialization
console.log('Supabase client initialized with URL:', supabaseUrl);

// Add a listener for auth state changes to debug session issues
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state change:', event, {
    hasSession: !!session,
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      app_metadata: session.user.app_metadata
    } : null
  });
  
  // For debugging purposes, check if local storage is accessible
  try {
    const testItem = 'supabase-auth-test';
    localStorage.setItem(testItem, 'test');
    const retrieved = localStorage.getItem(testItem);
    if (retrieved !== 'test') {
      console.error('LocalStorage test failed: value does not match');
    }
    localStorage.removeItem(testItem);
    console.log('LocalStorage is working properly');
  } catch (e) {
    console.error('LocalStorage test failed with error:', e);
  }
});

// Helper function to create a timeout promise
const createTimeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
};

// Add a custom method to verify and refresh the auth state
export const verifyAuth = async () => {
  try {
    const sessionPromise = supabase.auth.getSession();
    const result = await Promise.race([
      sessionPromise,
      createTimeoutPromise(SUPABASE_TIMEOUT_MS)
    ]).catch(error => {
      console.error('verifyAuth: Auth check timed out:', error);
      return { data: { session: null }, error: new Error('Auth check timed out') };
    });
    
    const { data, error } = result;
    
    if (error) {
      console.error('verifyAuth: Error getting session:', error);
      return { user: null, session: null, error };
    }
    
    if (!data.session) {
      console.log('verifyAuth: No session found');
      return { user: null, session: null, error: null };
    }
    
    // Check if token is about to expire (within 5 minutes)
    const expiresAt = data.session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    
    if (expiresAt && now > expiresAt - 300) { // 300 seconds = 5 minutes
      console.log('verifyAuth: Session about to expire, refreshing');
      
      const refreshPromise = supabase.auth.refreshSession();
      const refreshResult = await Promise.race([
        refreshPromise,
        createTimeoutPromise(SUPABASE_TIMEOUT_MS)
      ]).catch(error => {
        console.error('verifyAuth: Session refresh timed out:', error);
        return { data: { user: null, session: null }, error: new Error('Session refresh timed out') };
      });
      
      const { data: refreshData, error: refreshError } = refreshResult;
      
      if (refreshError) {
        console.error('verifyAuth: Error refreshing session:', refreshError);
        return { user: null, session: null, error: refreshError };
      }
      
      return { 
        user: refreshData.user, 
        session: refreshData.session,
        error: null
      };
    }
    
    return { 
      user: data.session.user,
      session: data.session,
      error: null
    };
  } catch (error) {
    console.error('verifyAuth: Unexpected error:', error);
    return { user: null, session: null, error };
  }
};