import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Key,
  Search,
  Database,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

type Page = 'home' | 'add' | 'search' | 'ledger' | 'feed' | 'entry' | 'settings';

interface SettingsPageProps {
  navigateTo: (page: Page, entryId?: string) => void;
}

interface AppSettings {
  openaiApiKey: string;
  databaseUrl: string;
  semanticSearchThreshold: number;
  semanticSearchLimit: number;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ navigateTo }) => {
  const [settings, setSettings] = useState<AppSettings>({
    openaiApiKey: '',
    databaseUrl: '',
    semanticSearchThreshold: 0.7,
    semanticSearchLimit: 20
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', content: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDatabaseUrl, setShowDatabaseUrl] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await window.electronAPI.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', content: 'Failed to load settings' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.saveSettings(settings);
      setMessage({ type: 'success', content: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', content: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      const defaultSettings: AppSettings = {
        openaiApiKey: '',
        databaseUrl: 'postgresql://localhost:5432/commonbase-electron',
        semanticSearchThreshold: 0.7,
        semanticSearchLimit: 20
      };
      setSettings(defaultSettings);
      setMessage({ type: 'success', content: 'Settings reset to defaults' });
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure environment variables and search preferences
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              {message.content}
            </div>
          </div>
        )}

        <div className="max-w-2xl space-y-8">
          {/* OpenAI Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Key className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">OpenAI Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.openaiApiKey}
                    onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Required for AI image description and text embeddings
                </p>
              </div>
            </div>
          </div>

          {/* Database Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Database Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Database URL
                </label>
                <div className="relative">
                  <input
                    type={showDatabaseUrl ? 'text' : 'password'}
                    value={settings.databaseUrl}
                    onChange={(e) => updateSetting('databaseUrl', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="postgresql://localhost:5432/commonbase-electron"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDatabaseUrl(!showDatabaseUrl)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showDatabaseUrl ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  PostgreSQL connection string with pgvector extension
                </p>
              </div>
            </div>
          </div>

          {/* Search Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search Configuration</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Semantic Search Similarity Threshold
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={settings.semanticSearchThreshold}
                    onChange={(e) => updateSetting('semanticSearchThreshold', parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[3rem]">
                    {settings.semanticSearchThreshold.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Minimum similarity score for search results (0.1 = very loose, 1.0 = exact match)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Search Results
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.semanticSearchLimit}
                  onChange={(e) => updateSetting('semanticSearchLimit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Maximum number of results to show in search and similar entries
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;