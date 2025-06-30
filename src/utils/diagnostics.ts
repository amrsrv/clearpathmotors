import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

/**
 * Utility to check database connection and auth status
 */
export const checkDatabaseConnection = async () => {
  console.log('Running database connection diagnostic check...');
  
  try {
    // Test a simple query to verify database connection
    const start = Date.now();
    const { data, error } = await supabase
      .from('applications')
      .select('count')
      .limit(1);
      
    const elapsed = Date.now() - start;
    
    if (error) {
      console.error('Database connection error:', error);
      return {
        connected: false,
        latency: null,
        error: error.message,
        details: error
      };
    }
    
    console.log(`Database connection successful (${elapsed}ms)`);
    return {
      connected: true, 
      latency: elapsed,
      error: null,
      details: data
    };
  } catch (error) {
    console.error('Database connection exception:', error);
    return {
      connected: false,
      latency: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

/**
 * Comprehensive system check for debugging auth and database issues
 */
export const runSystemCheck = async () => {
  console.log('Running system check...');
  const results: Record<string, any> = {};
  
  // 1. Check environment variables
  results.environment = {
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    nodeEnv: import.meta.env.NODE_ENV || 'unknown'
  };
  
  // 2. Check browser storage
  try {
    results.storage = {
      localStorageAvailable: false,
      sessionStorageAvailable: false,
      cookiesAvailable: false
    };
    
    // Test localStorage
    const testKey = '__test_local_storage__';
    localStorage.setItem(testKey, 'test');
    const localValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    results.storage.localStorageAvailable = localValue === 'test';
    
    // Test sessionStorage
    const sessionKey = '__test_session_storage__';
    sessionStorage.setItem(sessionKey, 'test');
    const sessionValue = sessionStorage.getItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
    results.storage.sessionStorageAvailable = sessionValue === 'test';
    
    // Check if cookies are enabled
    document.cookie = "testcookie=1; SameSite=Strict; max-age=3600; path=/";
    results.storage.cookiesAvailable = document.cookie.indexOf("testcookie=") !== -1;
  } catch (e) {
    console.error('Storage check error:', e);
    results.storage = { error: e instanceof Error ? e.message : 'Unknown error' };
  }
  
  // 3. Check current auth state
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    results.auth = {
      hasSession: !!sessionData.session,
      error: sessionError?.message || null
    };
    
    if (sessionData.session) {
      const expiresAt = new Date((sessionData.session.expires_at || 0) * 1000);
      const now = new Date();
      results.auth.sessionValid = expiresAt > now;
      results.auth.expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000); // seconds
      
      // Get user data
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        results.auth.userError = userError.message;
      } else if (userData.user) {
        results.auth.hasUser = true;
        results.auth.userId = userData.user.id;
        results.auth.email = userData.user.email;
        results.auth.role = userData.user.app_metadata?.role || 'unknown';
      }
    }
  } catch (e) {
    console.error('Auth check error:', e);
    results.auth = { error: e instanceof Error ? e.message : 'Unknown error' };
  }
  
  // 4. Check database connection
  results.database = await checkDatabaseConnection();
  
  // 5. Check for any RLS policy issues by testing a simple query as the current user
  if (results.auth?.hasUser) {
    try {
      const { error: rlsError } = await supabase
        .from('applications')
        .select('id')
        .limit(1);
        
      results.rls = {
        canAccessData: !rlsError,
        error: rlsError?.message || null
      };
    } catch (e) {
      console.error('RLS check error:', e);
      results.rls = { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
  
  console.log('System check results:', results);
  return results;
};

/**
 * Run a quick diagnostic and display a toast with the results
 */
export const runQuickDiagnostic = async () => {
  console.log('Running quick diagnostic...');
  
  try {
    // Check database connection
    const dbCheck = await checkDatabaseConnection();
    
    // Check authentication
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session;
    
    // Check storage
    const storageOk = (() => {
      try {
        const testKey = '__test_storage__';
        localStorage.setItem(testKey, 'test');
        const value = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return value === 'test';
      } catch (e) {
        return false;
      }
    })();
    
    if (dbCheck.connected && (hasSession || !sessionData) && storageOk) {
      toast.success(`System check passed: DB OK${hasSession ? ', Auth OK' : ''}, Storage OK`);
    } else {
      const issues = [];
      if (!dbCheck.connected) issues.push('Database connection failed');
      if (!hasSession && sessionData) issues.push('Auth session missing');
      if (!storageOk) issues.push('Browser storage unavailable');
      
      toast.error(`System check failed: ${issues.join(', ')}`);
    }
    
    return { dbCheck, hasSession, storageOk };
  } catch (error) {
    console.error('Diagnostic error:', error);
    toast.error('Diagnostic failed with error');
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};