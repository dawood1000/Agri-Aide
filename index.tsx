
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Service Worker Registration for PWA functionality.
 * We handle the registration in a robust async function to catch and manage
 * environment-specific restrictions (like sandboxed iframes or opaque origins)
 * which can throw "invalid state" or "security" errors.
 */
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Service Workers require a secure context (HTTPS/localhost).
  // Some sandboxed environments have an opaque origin ('null'), where SWs are prohibited.
  if (!window.isSecureContext || window.location.origin === 'null') {
    console.log('AgriAide: Service Worker registration skipped due to environment context.');
    return;
  }

  try {
    // Ensure the document is fully loaded before registration
    if (document.readyState !== 'complete') {
      await new Promise((resolve) => window.addEventListener('load', resolve));
    }

    /**
     * Origin Check:
     * In some preview environments, the absolute path '/' might resolve to a different origin 
     * than the one serving the page, causing a "SecurityError" or origin mismatch.
     */
    const swUrl = new URL('./sw.js', window.location.href);
    if (swUrl.origin !== window.location.origin) {
      console.log('AgriAide: Service Worker registration skipped due to origin mismatch between script and page.');
      return;
    }

    const registration = await navigator.serviceWorker.register(swUrl.pathname + swUrl.search);
    console.log('AgriAide: ServiceWorker registration successful with scope:', registration.scope);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Specifically handle common environment-related SW registration errors
    if (errorMessage.includes('invalid state')) {
      console.info('AgriAide: Service Worker is not supported in this specific preview state.');
    } else if (errorMessage.includes('origin')) {
      console.info('AgriAide: Service Worker registration failed due to origin restrictions.');
    } else {
      console.warn('AgriAide: ServiceWorker registration skipped:', errorMessage);
    }
  }
};

registerServiceWorker();
