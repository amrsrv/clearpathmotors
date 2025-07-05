/// <reference types="vite/client" />

// Declare global window properties for analytics
interface Window {
  dataLayer?: any[];
  gtag?: (...args: any[]) => void;
  fbq?: (...args: any[]) => void;
  _fbq?: any;
}