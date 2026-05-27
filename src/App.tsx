import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from '@store/themeStore';
import { useDocumentStore } from '@store/documentStore';
import LoadingScreen from '@components/shared/LoadingScreen';
import Layout from '@components/shared/Layout';
import ErrorBoundary from '@components/shared/ErrorBoundary';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@pages/HomePage'));
const WriterPage = lazy(() => import('@pages/WriterPage'));
const CalcPage = lazy(() => import('@pages/CalcPage'));
const ImpressPage = lazy(() => import('@pages/ImpressPage'));
const PDFPage = lazy(() => import('@pages/PDFPage'));
const FilesPage = lazy(() => import('@pages/FilesPage'));
const TemplatesPage = lazy(() => import('@pages/TemplatesPage'));
const SettingsPage = lazy(() => import('@pages/SettingsPage'));
const HelpPage = lazy(() => import('@pages/HelpPage'));
const AboutPage = lazy(() => import('@pages/AboutPage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));

export default function App() {
  const { i18n } = useTranslation();
  const { theme } = useThemeStore();
  const { initializeStore } = useDocumentStore();

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  }, [theme]);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-200">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="writer" element={<WriterPage />} />
              <Route path="writer/:id" element={<WriterPage />} />
              <Route path="calc" element={<CalcPage />} />
              <Route path="calc/:id" element={<CalcPage />} />
              <Route path="impress" element={<ImpressPage />} />
              <Route path="impress/:id" element={<ImpressPage />} />
              <Route path="pdf" element={<PDFPage />} />
              <Route path="pdf/:id" element={<PDFPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--toast-bg, #1e293b)',
              color: 'var(--toast-color, #f1f5f9)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
