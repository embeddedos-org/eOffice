import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; errorInfo?: ErrorInfo; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('eOffice Error:', error, errorInfo);
    this.setState({ errorInfo });
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportError({ error, errorInfo, url: window.location.href });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
          <div className="max-w-md w-full card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Something went wrong</h1>
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-6">
              eOffice encountered an unexpected error. Your work has been auto-saved.
            </p>
            {this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-xs text-surface-400 cursor-pointer hover:text-surface-600">Error details</summary>
                <pre className="mt-2 text-xs bg-surface-100 dark:bg-surface-800 p-3 rounded-lg overflow-auto text-red-600 dark:text-red-400">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="btn-primary"
              >
                <RefreshCw size={16} /> Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="btn-secondary"
              >
                <Home size={16} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
