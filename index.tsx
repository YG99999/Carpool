import React from 'react';
import ReactDOM from 'react-dom/client';
// NOTE: We must include the .tsx extension when using Babel in the browser
import App from './App.tsx';

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