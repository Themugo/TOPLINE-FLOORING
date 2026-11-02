import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource-variable/sora';
import '@fontsource-variable/manrope';
import './index.css';
import { initPwa } from './lib/pwa';

// Captures the install prompt early (it can fire before React mounts) and registers the service worker in production.
initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
