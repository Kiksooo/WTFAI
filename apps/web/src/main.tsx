import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Admin from './Admin';
import Policy from './Policy';
import './index.css';

const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
const isAdmin = pathname === '/admin';
const isPolicy = pathname === '/policy';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin ? <Admin /> : isPolicy ? <Policy /> : <App />}
  </React.StrictMode>
);
