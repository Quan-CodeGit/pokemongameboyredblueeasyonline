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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
