import { runSystemCheck } from '../utils/diagnostics';

console.log('=== Clearpath System Diagnostic Tool ===');
console.log('Starting comprehensive system check...');

runSystemCheck().then((results) => {
  console.log('\n=== DIAGNOSTIC RESULTS ===');
  
  // Print environment checks
  console.log('\n--- Environment Variables ---');
  console.log(`Supabase URL: ${results.environment.supabaseUrl ? 'Available' : 'MISSING'}`);
  console.log(`Supabase Anon Key: ${results.environment.supabaseAnonKey ? 'Available' : 'MISSING'}`);
  console.log(`Node Environment: ${results.environment.nodeEnv}`);
  
  // Print storage checks
  console.log('\n--- Browser Storage ---');
  if (results.storage.error) {
    console.log(`Error: ${results.storage.error}`);
  } else {
    console.log(`localStorage: ${results.storage.localStorageAvailable ? 'Available' : 'UNAVAILABLE'}`);
    console.log(`sessionStorage: ${results.storage.sessionStorageAvailable ? 'Available' : 'UNAVAILABLE'}`);
    console.log(`Cookies: ${results.storage.cookiesAvailable ? 'Available' : 'UNAVAILABLE'}`);
  }
  
  // Print auth checks
  console.log('\n--- Authentication ---');
  if (results.auth.error) {
    console.log(`Error: ${results.auth.error}`);
  } else {
    console.log(`Active Session: ${results.auth.hasSession ? 'Yes' : 'No'}`);
    if (results.auth.hasSession) {
      console.log(`Session Valid: ${results.auth.sessionValid ? 'Yes' : 'No'}`);
      console.log(`Expires in: ${results.auth.expiresIn} seconds`);
      console.log(`User Present: ${results.auth.hasUser ? 'Yes' : 'No'}`);
      if (results.auth.hasUser) {
        console.log(`User ID: ${results.auth.userId}`);
        console.log(`Email: ${results.auth.email}`);
        console.log(`Role: ${results.auth.role}`);
      }
    }
  }
  
  // Print database connection
  console.log('\n--- Database Connection ---');
  if (results.database.error) {
    console.log(`Error: ${results.database.error}`);
  } else {
    console.log(`Connected: ${results.database.connected ? 'Yes' : 'No'}`);
    console.log(`Latency: ${results.database.latency}ms`);
  }
  
  // Print RLS policy checks
  if (results.rls) {
    console.log('\n--- Row Level Security ---');
    if (results.rls.error) {
      console.log(`Error: ${results.rls.error}`);
    } else {
      console.log(`Can Access Data: ${results.rls.canAccessData ? 'Yes' : 'No'}`);
    }
  }
  
  // Print overall assessment
  console.log('\n=== SUMMARY ===');
  const environmentOk = results.environment.supabaseUrl && results.environment.supabaseAnonKey;
  const storageOk = !results.storage.error && results.storage.localStorageAvailable;
  const dbOk = results.database.connected;
  const authOk = !results.auth.error && (results.auth.hasSession ? results.auth.sessionValid : true);
  
  if (environmentOk && storageOk && dbOk && authOk) {
    console.log('✅ All systems operational');
  } else {
    console.log('⚠️ System issues detected:');
    if (!environmentOk) console.log('  - Missing environment variables');
    if (!storageOk) console.log('  - Browser storage issues');
    if (!dbOk) console.log('  - Database connection problems');
    if (!authOk) console.log('  - Authentication issues');
  }
  
  console.log('\nDiagnostic complete.');
}).catch(error => {
  console.error('Diagnostic failed with error:', error);
});