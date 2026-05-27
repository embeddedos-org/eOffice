import React from 'react';
import { LayoutTemplate } from 'lucide-react';
export default function TemplatesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-surface-400">
      <LayoutTemplate size={64} className="mb-4 opacity-30" />
      <h2 className="text-xl font-semibold mb-2">Templates</h2>
      <p className="text-sm">Browse and use document templates.</p>
    </div>
  );
}
