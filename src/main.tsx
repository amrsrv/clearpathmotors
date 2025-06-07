import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

// Log environment variables availability (not their values) for debugging
console.log('Environment variables check:', {
  supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </StrictMode>
);