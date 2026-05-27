import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-950 z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center animate-pulse-slow">
          <span className="text-white font-bold text-2xl">e</span>
        </div>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-500"
              style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }}
            />
          ))}
        </div>
        <p className="text-sm text-surface-500 dark:text-surface-400">Loading eOffice...</p>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
