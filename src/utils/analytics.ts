// Analytics utility functions for conditionally controlling tracking

// Flag to track whether analytics are enabled
let analyticsEnabled = true;

/**
 * Tracks a page view with analytics if they're enabled
 */
export const trackPageView = () => {
  // Only track page views if analytics are enabled
  if (!analyticsEnabled) {
    return;
  }

  // Track Google Analytics page view
  if (window.gtag) {
    try {
      window.gtag('config', 'G-RD8VCZ49QT');
    } catch (error) {
      console.error('Error tracking Google Analytics page view:', error);
    }
  }

  // Track Meta Pixel page view
  if (window.fbq) {
    try {
      window.fbq('track', 'PageView');
    } catch (error) {
      console.error('Error tracking Meta Pixel page view:', error);
    }
  }
};

/**
 * Disables analytics tracking for authenticated users
 * @param isAuthenticated Whether the user is authenticated
 */
export const manageAnalytics = (isAuthenticated: boolean) => {
  // Update the analytics enabled flag
  analyticsEnabled = !isAuthenticated;
  
  // If analytics are disabled, we'll prevent future tracking
  // but we won't try to remove the scripts or delete window properties
  if (isAuthenticated) {
    console.log('Analytics disabled for authenticated user');
  } else {
    console.log('Analytics enabled for unauthenticated user');
  }
};