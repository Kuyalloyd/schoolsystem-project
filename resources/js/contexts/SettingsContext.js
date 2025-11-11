import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    schoolName: 'FSUU',
    schoolCode: 'SMS-2025',
    academicYear: '2024-2025',
    timezone: 'Eastern Time (ET)',
    defaultLanguage: 'English',
    currency: 'PHP (₱)'
  });

  const [appearance, setAppearance] = useState({
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    themeMode: 'light',
    fontFamily: 'inter',
    sidebarPosition: 'left',
    compactMode: 'off',
    logoPath: null,
    faviconPath: null
  });

  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadAppearance();
  }, []);

  // Apply appearance settings whenever they change
  useEffect(() => {
    applyAppearanceSettings(appearance);
  }, [appearance]);

  const loadSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings');
      if (res && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.warn('Could not load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAppearance = async () => {
    try {
      const res = await axios.get('/api/admin/settings/appearance');
      if (res && res.data) {
        setAppearance(res.data);
      }
    } catch (err) {
      console.warn('Could not load appearance settings', err);
    }
  };

  const applyAppearanceSettings = (settings) => {
    const root = document.documentElement;
    
    // Apply colors
    if (settings.primaryColor) {
      root.style.setProperty('--primary-color', settings.primaryColor);
    }
    if (settings.secondaryColor) {
      root.style.setProperty('--secondary-color', settings.secondaryColor);
    }
    
    // Apply theme mode
    if (settings.themeMode) {
      document.body.setAttribute('data-theme', settings.themeMode);
      if (settings.themeMode === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
    
    // Apply font family
    if (settings.fontFamily) {
      root.style.setProperty('--font-family', settings.fontFamily);
    }
    
    // Apply favicon if exists
    if (settings.faviconPath) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = `/storage/${settings.faviconPath}`;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
    await loadAppearance();
  };

  const value = {
    settings,
    appearance,
    loading,
    refreshSettings,
    schoolName: settings.schoolName,
    schoolCode: settings.schoolCode,
    academicYear: settings.academicYear,
    currency: settings.currency,
    logo: appearance.logoPath ? `/storage/${appearance.logoPath}` : null,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
