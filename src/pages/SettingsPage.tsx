import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@store/themeStore';
import { Sun, Moon, Monitor, Globe, Palette, Bell, Shield, User, Key, Download, Trash2, ChevronRight, Check, Sparkles } from 'lucide-react';
import { cn } from '@utils/cn';
import i18n from '@i18n/config';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
];

const ACCENT_COLORS = [
  { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
  { name: 'Green', value: 'green', class: 'bg-green-500' },
  { name: 'Red', value: 'red', class: 'bg-red-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-500' },
];

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language & Region', icon: Globe },
  { id: 'ai', label: 'AI Assistant', icon: Sparkles },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'account', label: 'Account', icon: User },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [activeSection, setActiveSection] = useState('appearance');
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'en');
  const [openaiKey, setOpenaiKey] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);
  const [notifications, setNotifications] = useState({ email: true, browser: true, collaboration: true });

  const handleLangChange = (code: string) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={cn('relative w-10 h-5 rounded-full transition-colors', checked ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600')}
    >
      <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );

  return (
    <div className="flex h-full bg-surface-50 dark:bg-surface-950">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 p-4">
        <h1 className="text-lg font-bold text-surface-900 dark:text-white mb-6">Settings</h1>
        <nav className="space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all', activeSection === id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800')}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {activeSection === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">Appearance</h2>
                <p className="text-sm text-surface-500">Customize the look and feel of eOffice</p>
              </div>

              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value as any)}
                        className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all', theme === value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300')}
                      >
                        <Icon size={20} className={theme === value ? 'text-primary-600' : 'text-surface-500'} />
                        <span className={cn('text-sm font-medium', theme === value ? 'text-primary-700 dark:text-primary-400' : 'text-surface-600 dark:text-surface-400')}>{label}</span>
                        {theme === value && <Check size={14} className="text-primary-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Accent Color</h3>
                  <div className="flex gap-3">
                    {ACCENT_COLORS.map(color => (
                      <button key={color.value} title={color.name} className={cn('w-8 h-8 rounded-full transition-transform hover:scale-110', color.class)} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Compact Mode</p>
                    <p className="text-xs text-surface-400">Reduce spacing for more content</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Auto-save</p>
                    <p className="text-xs text-surface-400">Automatically save documents every 30 seconds</p>
                  </div>
                  <Toggle checked={autoSave} onChange={setAutoSave} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Spell Check</p>
                    <p className="text-xs text-surface-400">Check spelling as you type</p>
                  </div>
                  <Toggle checked={spellCheck} onChange={setSpellCheck} />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'language' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">Language & Region</h2>
                <p className="text-sm text-surface-500">Choose your preferred language and regional settings</p>
              </div>
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
                {LANGUAGES.map((lang, i) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLangChange(lang.code)}
                    className={cn('w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors', i < LANGUAGES.length - 1 && 'border-b border-surface-100 dark:border-surface-800', selectedLang === lang.code && 'bg-primary-50 dark:bg-primary-900/20')}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{lang.name}</span>
                      <span className="text-sm text-surface-400">{lang.native}</span>
                    </div>
                    {selectedLang === lang.code && <Check size={16} className="text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'ai' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">AI Assistant</h2>
                <p className="text-sm text-surface-500">Configure the AI writing assistant</p>
              </div>
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-surface-800 dark:text-surface-200 block mb-2">OpenAI API Key</label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    placeholder="sk-..."
                    className="input w-full"
                  />
                  <p className="text-xs text-surface-400 mt-1.5">Your API key is stored locally and never sent to our servers. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Get an API key →</a></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-800 dark:text-surface-200 block mb-2">AI Model</label>
                  <select className="input w-full">
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast, Affordable)</option>
                    <option value="gpt-4o">GPT-4o (Most Capable)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">AI Writing Suggestions</p>
                    <p className="text-xs text-surface-400">Show inline suggestions as you type</p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
                <button className="btn-primary w-full">Save AI Settings</button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">Notifications</h2>
                <p className="text-sm text-surface-500">Manage your notification preferences</p>
              </div>
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-5">
                {[
                  { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { key: 'browser', label: 'Browser Notifications', desc: 'Show desktop notifications' },
                  { key: 'collaboration', label: 'Collaboration Alerts', desc: 'Notify when someone edits your document' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{label}</p>
                      <p className="text-xs text-surface-400">{desc}</p>
                    </div>
                    <Toggle checked={notifications[key as keyof typeof notifications]} onChange={v => setNotifications(prev => ({ ...prev, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">Privacy & Security</h2>
                <p className="text-sm text-surface-500">Manage your privacy and security settings</p>
              </div>
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Analytics</p>
                    <p className="text-xs text-surface-400">Help improve eOffice by sharing usage data</p>
                  </div>
                  <Toggle checked={false} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">Crash Reports</p>
                    <p className="text-xs text-surface-400">Automatically send crash reports</p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
                <hr className="border-surface-100 dark:border-surface-800" />
                <div>
                  <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Data Management</h3>
                  <div className="space-y-2">
                    <button className="btn-secondary w-full"><Download size={14} />Export All Data</button>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors">
                      <Trash2 size={14} />Clear All Documents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-1">Account</h2>
                <p className="text-sm text-surface-500">Manage your account information</p>
              </div>
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">U</div>
                  <div>
                    <p className="text-base font-bold text-surface-900 dark:text-white">User</p>
                    <p className="text-sm text-surface-500">user@example.com</p>
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">Pro Plan</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="label">Display Name</label>
                    <input type="text" defaultValue="User" className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" defaultValue="user@example.com" className="input w-full" />
                  </div>
                </div>
                <button className="btn-primary">Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
