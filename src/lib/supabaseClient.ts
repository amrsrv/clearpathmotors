import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Log Supabase initialization
console.log('Supabase client initialized with URL:', supabaseUrl.substring(0, 20) + '...');

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
});