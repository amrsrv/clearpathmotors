import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Log environment variables availability (not their values) for debugging
console.log('Environment variables check:', {
  supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('CRITICAL: Missing required Supabase environment variables!');
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);