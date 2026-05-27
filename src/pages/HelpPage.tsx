import React from 'react';
import { HelpCircle } from 'lucide-react';
export default function HelpPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-surface-400">
      <HelpCircle size={64} className="mb-4 opacity-30" />
      <h2 className="text-xl font-semibold mb-2">Help & Documentation</h2>
      <p className="text-sm">Find answers to your questions.</p>
    </div>
  );
}
