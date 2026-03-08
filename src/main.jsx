import React from 'react';
import ReactDOM from 'react-dom/client';
import PokemonGame from './PokemonGame';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PokemonGame />
  </React.StrictMode>
);

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      // When a new SW takes control (after skipWaiting), auto-reload to get fresh code
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }).catch(() => {});
  });
}
