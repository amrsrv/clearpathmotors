// Analytics utility functions for conditionally loading tracking scripts

// Flag to track whether analytics are enabled
let analyticsEnabled = false;

/**
 * Injects Google Analytics scripts into the document
 */
export const injectGoogleAnalytics = () => {
  // Check if GA script already exists
  if (document.getElementById('ga-script')) {
    return;
  }

  // Create and inject the Google Analytics script
  const gaScript = document.createElement('script');
  gaScript.id = 'ga-script';
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-RD8VCZ49QT';
  document.head.appendChild(gaScript);

  // Create and inject the gtag configuration script
  const gtagScript = document.createElement('script');
  gtagScript.id = 'gtag-config';
  gtagScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-RD8VCZ49QT');
  `;
  document.head.appendChild(gtagScript);
};

/**
 * Removes Google Analytics scripts from the document
 */
export const removeGoogleAnalytics = () => {
  // Remove the GA script
  const gaScript = document.getElementById('ga-script');
  if (gaScript) {
    gaScript.remove();
  }

  // Remove the gtag configuration script
  const gtagScript = document.getElementById('gtag-config');
  if (gtagScript) {
    gtagScript.remove();
  }

  // Clean up any global variables
  if (window.dataLayer) {
    delete window.dataLayer;
  }
  if (window.gtag) {
    delete window.gtag;
  }
};

/**
 * Injects Meta Pixel (Facebook) scripts into the document
 */
export const injectMetaPixel = () => {
  // Check if Meta Pixel script already exists
  if (document.getElementById('fb-pixel')) {
    return;
  }

  // Create and inject the Meta Pixel script
  const fbScript = document.createElement('script');
  fbScript.id = 'fb-pixel';
  fbScript.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '1739938766881223');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(fbScript);

  // Create and inject the Meta Pixel noscript element
  const fbNoscript = document.createElement('noscript');
  fbNoscript.id = 'fb-pixel-noscript';
  const fbImg = document.createElement('img');
  fbImg.height = 1;
  fbImg.width = 1;
  fbImg.style.display = 'none';
  fbImg.src = 'https://www.facebook.com/tr?id=1739938766881223&ev=PageView&noscript=1';
  fbNoscript.appendChild(fbImg);
  document.body.appendChild(fbNoscript);
};

/**
 * Removes Meta Pixel (Facebook) scripts from the document
 */
export const removeMetaPixel = () => {
  // Remove the Meta Pixel script
  const fbScript = document.getElementById('fb-pixel');
  if (fbScript) {
    fbScript.remove();
  }

  // Remove the Meta Pixel noscript element
  const fbNoscript = document.getElementById('fb-pixel-noscript');
  if (fbNoscript) {
    fbNoscript.remove();
  }

  // Clean up any global variables
  if (window.fbq) {
    delete window.fbq;
  }
  if (window._fbq) {
    delete window._fbq;
  }
};

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
    window.gtag('config', 'G-RD8VCZ49QT');
  }

  // Track Meta Pixel page view
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
};

/**
 * Manages analytics scripts based on authentication status
 * @param isAuthenticated Whether the user is authenticated
 */
export const manageAnalytics = (isAuthenticated: boolean) => {
  // Update the analytics enabled flag
  analyticsEnabled = !isAuthenticated;

  if (isAuthenticated) {
    // User is logged in, remove tracking scripts
    removeGoogleAnalytics();
    removeMetaPixel();
  } else {
    // User is not logged in, inject tracking scripts
    injectGoogleAnalytics();
    injectMetaPixel();
  }
};