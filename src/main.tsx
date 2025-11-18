import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { StorageProvider } from './services/storage/StorageContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StorageProvider>
      <App />
    </StorageProvider>
  </React.StrictMode>,
);
