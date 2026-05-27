import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText, Table2, Presentation, FileImage, FolderOpen, LayoutTemplate,
  Settings, HelpCircle, Info, Home, ChevronLeft, ChevronRight, Menu, X,
  Bell, Search, User, Moon, Sun, Monitor, Globe, Wifi, WifiOff, Zap
} from 'lucide-react';
import { useThemeStore } from '@store/themeStore';
import { useDocumentStore } from '@store/documentStore';
import { cn } from '@utils/cn';
import { SUPPORTED_LANGUAGES } from '@i18n/config';
import i18n from 'i18next';

const navItems = [
  { path: '/', icon: Home, labelKey: 'nav.home', color: 'text-surface-600' },
  { path: '/writer', icon: FileText, labelKey: 'nav.writer', color: 'text-writer-500' },
  { path: '/calc', icon: Table2, labelKey: 'nav.calc', color: 'text-calc-500' },
  { path: '/impress', icon: Presentation, labelKey: 'nav.impress', color: 'text-impress-500' },
  { path: '/pdf', icon: FileImage, labelKey: 'nav.pdf', color: 'text-pdf-500' },
  { path: '/files', icon: FolderOpen, labelKey: 'nav.files', color: 'text-surface-600' },
  { path: '/templates', icon: LayoutTemplate, labelKey: 'nav.templates', color: 'text-surface-600' },
];

const bottomNavItems = [
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { path: '/help', icon: HelpCircle, labelKey: 'nav.help' },
  { path: '/about', icon: Info, labelKey: 'nav.about' },
];

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { hasUnsavedChanges, isSaving } = useDocumentStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLangMenu, setShowLangMenu] = useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <aside className={cn(
        'hidden md:flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 transition-all duration-300 z-20',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">e</span>
              </div>
              <span className="font-bold text-lg gradient-text">eOffice</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">e</span>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} className="toolbar-btn">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map(({ path, icon: Icon, labelKey, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(path)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
              )}
              title={sidebarCollapsed ? t(labelKey) : undefined}
            >
              <Icon size={18} className={isActive(path) ? 'text-primary-600 dark:text-primary-400' : color} />
              {!sidebarCollapsed && <span>{t(labelKey)}</span>}
              {!sidebarCollapsed && isActive(path) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-surface-200 dark:border-surface-700 space-y-1">
          {/* Status bar */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-surface-500 dark:text-surface-400">
              {isOnline ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-500" />}
              <span>{isOnline ? t('status.online', { defaultValue: 'Online' }) : t('status.offline')}</span>
              {isSaving && <><Zap size={12} className="text-yellow-500 ml-auto" /><span>{t('file.saving')}</span></>}
              {hasUnsavedChanges && !isSaving && <span className="ml-auto text-yellow-500">●</span>}
            </div>
          )}

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors', sidebarCollapsed && 'justify-center')}
              title={sidebarCollapsed ? 'Language' : undefined}
            >
              <Globe size={18} />
              {!sidebarCollapsed && <span className="flex-1 text-left">{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.nativeName || 'English'}</span>}
            </button>
            {showLangMenu && !sidebarCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-strong overflow-hidden z-50 max-h-64 overflow-y-auto">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors', i18n.language === lang.code && 'text-primary-600 dark:text-primary-400 font-medium')}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    <span className="ml-auto text-xs text-surface-400">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors', sidebarCollapsed && 'justify-center')}
            title={sidebarCollapsed ? 'Toggle theme' : undefined}
          >
            <ThemeIcon size={18} />
            {!sidebarCollapsed && <span className="capitalize">{theme} Mode</span>}
          </button>

          {bottomNavItems.map(({ path, icon: Icon, labelKey }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                isActive(path) ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800',
                sidebarCollapsed && 'justify-center'
              )}
              title={sidebarCollapsed ? t(labelKey) : undefined}
            >
              <Icon size={18} />
              {!sidebarCollapsed && <span>{t(labelKey)}</span>}
            </button>
          ))}

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)} className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-surface-900 shadow-strong overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">e</span>
                </div>
                <span className="font-bold text-lg gradient-text">eOffice</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="toolbar-btn"><X size={18} /></button>
            </div>
            <nav className="p-2 space-y-1">
              {[...navItems, ...bottomNavItems].map(({ path, icon: Icon, labelKey }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); setMobileMenuOpen(false); }}
                  className={cn('w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all', isActive(path) ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800')}
                >
                  <Icon size={18} />
                  <span>{t(labelKey)}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
          <button onClick={() => setMobileMenuOpen(true)} className="toolbar-btn"><Menu size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">e</span>
            </div>
            <span className="font-bold gradient-text">eOffice</span>
          </div>
          <button onClick={cycleTheme} className="toolbar-btn"><ThemeIcon size={18} /></button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
