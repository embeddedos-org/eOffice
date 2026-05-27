import React from 'react';
import { Info } from 'lucide-react';
export default function AboutPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-surface-400 p-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-6">
        <span className="text-white font-bold text-3xl">e</span>
      </div>
      <h1 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">eOffice</h1>
      <p className="text-primary-600 font-medium mb-4">Version 1.0.0</p>
      <p className="text-center text-surface-600 dark:text-surface-400 max-w-md">
        The world's most advanced open-source office suite. Built with modern web technologies
        to surpass MS Office, LibreOffice, and OpenOffice.
      </p>
      <div className="mt-6 text-sm text-surface-400">
        <p>© 2024 eOffice Contributors. MIT License.</p>
      </div>
    </div>
  );
}
