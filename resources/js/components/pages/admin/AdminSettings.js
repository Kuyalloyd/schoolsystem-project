import React, { useState, useEffect } from 'react';
import { FiSettings, FiBook, FiBell, FiShield, FiGrid, FiSave } from 'react-icons/fi';
import Sidebar from './Sidebar';
import { useSettings } from '../../../contexts/SettingsContext';
import axios from 'axios';
import "../../../../sass/AdminDashboard.scss";

export default function AdminSettings() {
  const { refreshSettings } = useSettings();
  const [activePage, setActivePage] = useState('settings');
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    schoolName: 'Father Saturnino Urios University',
    schoolCode: 'RHS-2025',
    academicYear: '2024-2025',
    timezone: 'Eastern Time (ET)',
    defaultLanguage: 'English',
    currency: 'PHP (₱)'
  });

  const [appearanceForm, setAppearanceForm] = useState({
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    themeMode: 'light',
    fontFamily: 'inter',
    sidebarPosition: 'left',
    compactMode: 'off',
    logo: null,
    favicon: null
  });

  // Add security features state
  const [securityForm, setSecurityForm] = useState({
    twoFactorAuth: false,
    ipWhitelist: false,
    emailVerification: true,
    activityLogging: true
  });

  // Function to apply appearance settings to the site
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
    
    // Update page title with school name if available
    const schoolName = settingsForm.schoolName || 'School Management System';
    document.title = `${schoolName} - Admin Dashboard`;
  };

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const res = await axios.get('/api/admin/settings');
        if (!mounted) return;
        if (res && res.data) {
          setSettingsForm(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.warn('Could not load settings', err);
      }
    };
    
    const loadAppearance = async () => {
      try {
        const res = await axios.get('/api/admin/settings/appearance');
        if (!mounted) return;
        if (res && res.data) {
          setAppearanceForm(prev => ({ ...prev, ...res.data }));
          // Apply appearance settings to the site
          applyAppearanceSettings(res.data);
        }
      } catch (err) {
        console.warn('Could not load appearance settings', err);
      }
    };
    
    loadSettings();
    loadAppearance();
    return () => { mounted = false; };
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // Validate all required fields
    const requiredFields = ['schoolName', 'schoolCode', 'academicYear', 'timezone', 'defaultLanguage', 'currency'];
    const missingFields = requiredFields.filter(field => !settingsForm[field] || settingsForm[field].trim() === '');
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setLoading(true);
    try {
      const payload = { ...settingsForm, ...securityForm };
      const res = await axios.put('/api/admin/settings', payload);
      alert(res?.data?.message || 'Settings saved successfully!');
      // Refresh settings in context so changes appear immediately across the site
      await refreshSettings();
    } catch (err) {
      console.error('Failed to save settings', err);
      console.error('Error response:', err?.response?.data);
      
      // Show detailed error message
      let errorMsg = 'Failed to save settings';
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorList = Object.keys(errors).map(key => `${key}: ${errors[key].join(', ')}`).join('\n');
        errorMsg = `Validation errors:\n${errorList}`;
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettingsForm({
        schoolName: 'Father Saturnino Urios University',
        schoolCode: 'RHS-2025',
        academicYear: '2024-2025',
        timezone: 'Eastern Time (ET)',
        defaultLanguage: 'English',
        currency: 'PHP (₱)'
      });
    }
  };

  const handleAppearanceSave = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      // Only append non-file fields and actual file objects
      Object.keys(appearanceForm).forEach(key => {
        const value = appearanceForm[key];
        
        // Skip null/undefined values
        if (!value) return;
        
        // For file fields, only append if it's an actual File object
        if (key === 'logo' || key === 'favicon') {
          if (value instanceof File) {
            formData.append(key, value);
          }
        } else {
          // For non-file fields, append the value
          formData.append(key, value);
        }
      });
      
      console.log('Sending appearance data:', Object.fromEntries(formData));
      
      const res = await axios.post('/api/admin/settings/appearance', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res?.data?.message || 'Appearance settings saved successfully!');
      
      // Apply the new appearance settings immediately
      if (res?.data?.data) {
        applyAppearanceSettings(res.data.data);
      }
      
      // Refresh settings in context so changes appear immediately across the site
      await refreshSettings();
    } catch (err) {
      console.error('Failed to save appearance settings', err);
      console.error('Error response:', err?.response?.data);
      
      let errorMsg = 'Failed to save appearance settings';
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorList = Object.keys(errors).map(key => `${key}: ${errors[key].join(', ')}`).join('\n');
        errorMsg = `Validation errors:\n${errorList}`;
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setAppearanceForm({ ...appearanceForm, [field]: file });
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: FiSettings },
    { id: 'academic', label: 'Academic', icon: FiBook },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'appearance', label: 'Appearance', icon: FiGrid },
  ];

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="admin-main">
        <div style={{ padding: '32px 44px', background: '#fafbfc', minHeight: '100vh' }}>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            background: '#fff',
            padding: '20px 28px',
            borderRadius: 14,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f0f1f3'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 14, 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
              }}>
                <FiSettings size={28} color="#fff" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>System Settings</h1>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage your school management system configuration</p>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '8px 14px',
              background: '#d1fae5',
              borderRadius: 8
            }}>
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: '#10b981'
              }}></div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>System Active</span>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: 4, 
            marginBottom: 28,
            background: '#fff',
            padding: '6px',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: '1px solid #f0f1f3',
            overflowX: 'auto'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === tab.id ? '#111827' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#6b7280',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'general' && (
            <div>
              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiSettings size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>School Information</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Basic information about your educational institution</p>
                  </div>
                </div>

                <form onSubmit={handleSave}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        School Name
                      </label>
                      <input 
                        type="text"
                        value={settingsForm.schoolName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: 8, 
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          fontSize: 14, 
                          outline: 'none',
                          color: '#111827'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        School Code
                      </label>
                      <input 
                        type="text"
                        value={settingsForm.schoolCode}
                        onChange={(e) => setSettingsForm({ ...settingsForm, schoolCode: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: 8, 
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          fontSize: 14, 
                          outline: 'none',
                          color: '#111827'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        Academic Year
                      </label>
                      <select
                        value={settingsForm.academicYear}
                        onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: 8, 
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          fontSize: 14, 
                          outline: 'none',
                          color: '#111827',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="2022-2023">2022-2023</option>
                        <option value="2023-2024">2023-2024</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2025-2026">2025-2026</option>
                        <option value="2026-2027">2026-2027</option>
                        <option value="2027-2028">2027-2028</option>
                        <option value="2028-2029">2028-2029</option>
                        <option value="2029-2030">2029-2030</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                        Timezone
                      </label>
                      <select
                        value={settingsForm.timezone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                        style={{ 
                          width: '100%', 
                          padding: '11px 14px', 
                          borderRadius: 8, 
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          fontSize: 14, 
                          outline: 'none',
                          color: '#111827',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Eastern Time (ET)">Eastern Time (ET)</option>
                        <option value="Central Time (CT)">Central Time (CT)</option>
                        <option value="Mountain Time (MT)">Mountain Time (MT)</option>
                        <option value="Pacific Time (PT)">Pacific Time (PT)</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>

              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiGrid size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Regional Settings</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Configure language and currency preferences</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Default Language
                    </label>
                    <select
                      value={settingsForm.defaultLanguage}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultLanguage: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Currency
                    </label>
                    <select
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="PHP (₱)">PHP (₱)</option>
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                      <option value="GBP (£)">GBP (£)</option>
                      <option value="JPY (¥)">JPY (¥)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={handleReset}
                  style={{ 
                    padding: '11px 24px', 
                    borderRadius: 8, 
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Reset to Defaults
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  style={{ 
                    padding: '11px 24px', 
                    borderRadius: 8, 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                    color: '#fff', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <FiSave size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div>
              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiBook size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Grading System</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Configure grade scales and passing marks</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Grading Scale
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="percentage">Percentage (0-100)</option>
                      <option value="letter">Letter Grade (A-F)</option>
                      <option value="gpa">GPA (0.0-4.0)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Passing Grade
                    </label>
                    <input 
                      type="number"
                      defaultValue="60"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Max Credits Per Semester
                    </label>
                    <input 
                      type="number"
                      defaultValue="18"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Attendance Requirement (%)
                    </label>
                    <input 
                      type="number"
                      defaultValue="75"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiBook size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Term Configuration</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Manage academic terms and schedules</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Terms Per Year
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="2">2 Semesters</option>
                      <option value="3">3 Trimesters</option>
                      <option value="4">4 Quarters</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiBell size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Email Notifications</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Configure email alert preferences</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: 'New Student Enrollment', desc: 'Notify when a new student registers' },
                    { label: 'Grade Submissions', desc: 'Alert when teachers submit grades' },
                    { label: 'Attendance Reports', desc: 'Daily attendance summary emails' },
                    { label: 'System Updates', desc: 'Important system maintenance notifications' }
                  ].map((item, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: 8,
                      border: '1px solid #f0f1f3'
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{item.desc}</div>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          background: '#10b981',
                          borderRadius: 24,
                          transition: '0.3s'
                        }}>
                          <span style={{ 
                            position: 'absolute', 
                            height: 18, 
                            width: 18, 
                            left: 22, 
                            bottom: 3, 
                            background: '#fff',
                            borderRadius: '50%',
                            transition: '0.3s'
                          }}></span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiBell size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Notification Preferences</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>General notification settings</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Notification Frequency
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="realtime">Real-time</option>
                      <option value="hourly">Hourly Digest</option>
                      <option value="daily">Daily Digest</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Quiet Hours
                    </label>
                    <select
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="none">None</option>
                      <option value="9pm-7am">9 PM - 7 AM</option>
                      <option value="10pm-6am">10 PM - 6 AM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiShield size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Password Policy</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Configure password requirements and security rules</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Minimum Password Length
                    </label>
                    <input 
                      type="number"
                      defaultValue="8"
                      min="6"
                      max="20"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Password Expiry (days)
                    </label>
                    <input 
                      type="number"
                      defaultValue="90"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Max Login Attempts
                    </label>
                    <input 
                      type="number"
                      defaultValue="5"
                      min="3"
                      max="10"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Session Timeout (minutes)
                    </label>
                    <input 
                      type="number"
                      defaultValue="30"
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiShield size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Security Features</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Enable additional security measures</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f1f3' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Two-Factor Authentication</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Require 2FA for admin accounts</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input type="checkbox" checked={securityForm.twoFactorAuth} onChange={e => setSecurityForm(f => ({ ...f, twoFactorAuth: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: securityForm.twoFactorAuth ? '#10b981' : '#d1d5db',
                        borderRadius: 24,
                        transition: '0.3s'
                      }}>
                        <span style={{ 
                          position: 'absolute', 
                          height: 18, 
                          width: 18, 
                          left: securityForm.twoFactorAuth ? 22 : 3, 
                          bottom: 3, 
                          background: '#fff',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }}></span>
                      </span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f1f3' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>IP Whitelist</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Restrict access to specific IP addresses</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input type="checkbox" checked={securityForm.ipWhitelist} onChange={e => setSecurityForm(f => ({ ...f, ipWhitelist: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: securityForm.ipWhitelist ? '#10b981' : '#d1d5db',
                        borderRadius: 24,
                        transition: '0.3s'
                      }}>
                        <span style={{ 
                          position: 'absolute', 
                          height: 18, 
                          width: 18, 
                          left: securityForm.ipWhitelist ? 22 : 3, 
                          bottom: 3, 
                          background: '#fff',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }}></span>
                      </span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f1f3' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Email Verification</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Require email verification for new accounts</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input type="checkbox" checked={securityForm.emailVerification} onChange={e => setSecurityForm(f => ({ ...f, emailVerification: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: securityForm.emailVerification ? '#10b981' : '#d1d5db',
                        borderRadius: 24,
                        transition: '0.3s'
                      }}>
                        <span style={{ 
                          position: 'absolute', 
                          height: 18, 
                          width: 18, 
                          left: securityForm.emailVerification ? 22 : 3, 
                          bottom: 3, 
                          background: '#fff',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }}></span>
                      </span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f0f1f3' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Activity Logging</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Log all user activities for audit trail</div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                      <input type="checkbox" checked={securityForm.activityLogging} onChange={e => setSecurityForm(f => ({ ...f, activityLogging: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        background: securityForm.activityLogging ? '#10b981' : '#d1d5db',
                        borderRadius: 24,
                        transition: '0.3s'
                      }}>
                        <span style={{ 
                          position: 'absolute', 
                          height: 18, 
                          width: 18, 
                          left: securityForm.activityLogging ? 22 : 3, 
                          bottom: 3, 
                          background: '#fff',
                          borderRadius: '50%',
                          transition: '0.3s'
                        }}></span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div>
              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiGrid size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Theme & Branding</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Customize the look and feel of your system</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Logo Upload
                    </label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    />
                    {appearanceForm.logo && (
                      <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#10b981' }}>
                        Selected: {appearanceForm.logo.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Favicon Upload
                    </label>
                    <input 
                      type="file"
                      accept="image/x-icon,image/png"
                      onChange={(e) => handleFileChange(e, 'favicon')}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    />
                    {appearanceForm.favicon && (
                      <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#10b981' }}>
                        Selected: {appearanceForm.favicon.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#fff', 
                borderRadius: 14, 
                padding: '28px 32px',
                marginBottom: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f0f1f3'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiGrid size={18} color="#111827" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827' }}>Display Settings</h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#9ca3af' }}>Configure interface display options</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Theme Mode
                    </label>
                    <select
                      value={appearanceForm.themeMode}
                      onChange={(e) => setAppearanceForm({ ...appearanceForm, themeMode: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Font Family
                    </label>
                    <select
                      value={appearanceForm.fontFamily}
                      onChange={(e) => setAppearanceForm({ ...appearanceForm, fontFamily: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="inter">Inter</option>
                      <option value="roboto">Roboto</option>
                      <option value="opensans">Open Sans</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Sidebar Position
                    </label>
                    <select
                      value={appearanceForm.sidebarPosition}
                      onChange={(e) => setAppearanceForm({ ...appearanceForm, sidebarPosition: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Compact Mode
                    </label>
                    <select
                      value={appearanceForm.compactMode}
                      onChange={(e) => setAppearanceForm({ ...appearanceForm, compactMode: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '11px 14px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="on">On</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setAppearanceForm({
                      primaryColor: '#6366f1',
                      secondaryColor: '#8b5cf6',
                      themeMode: 'light',
                      fontFamily: 'inter',
                      sidebarPosition: 'left',
                      compactMode: 'off',
                      logo: null,
                      favicon: null
                    });
                  }}
                  style={{ 
                    padding: '11px 24px', 
                    borderRadius: 8, 
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Reset to Defaults
                </button>
                <button 
                  type="button"
                  onClick={handleAppearanceSave}
                  disabled={loading}
                  style={{ 
                    padding: '11px 24px', 
                    borderRadius: 8, 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                    color: '#fff', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <FiSave size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
