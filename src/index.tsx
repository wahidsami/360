import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500">Loading...</div>}>
            <App />
        </React.Suspense>
    </React.StrictMode>
);
