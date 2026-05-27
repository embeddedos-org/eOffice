import React from 'react';
import { useNavigate } from 'react-router-dom';
export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full text-surface-400">
      <h1 className="text-6xl font-bold text-surface-200 dark:text-surface-700 mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2 text-surface-600 dark:text-surface-400">Page Not Found</h2>
      <p className="text-sm mb-6">The page you're looking for doesn't exist.</p>
      <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
    </div>
  );
}
