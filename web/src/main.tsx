import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { reloadForStaleChunk } from './lib/chunk-reload';
import './styles/globals.css';

window.addEventListener('vite:preloadError', reloadForStaleChunk);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
