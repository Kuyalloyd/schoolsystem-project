import React, { useState, useEffect } from 'react';
import { FiUser, FiLock, FiBell, FiShield, FiCamera, FiSave } from 'react-icons/fi';
import Sidebar from './Sidebar';
import axios from 'axios';
import "../../../../sass/AdminDashboard.scss";

export default function AdminSettings() {
  const [activePage, setActivePage] = useState('settings');
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@school.edu',
    phone: '+1 (555) 123-4567',
    avatar: null
  });

  const [schoolForm, setSchoolForm] = useState({
    schoolName: 'Springfield High School',
    address: '123 Main Street',
    city: 'Springfield',
    state: 'IL',
    zipCode: '62701',
    country: 'United States'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    studentEnrollment: true,
    courseUpdates: true,
    systemAlerts: true
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/api/admin/profile', profileForm);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/api/admin/school-settings', schoolForm);
      alert('School settings updated successfully!');
    } catch (err) {
      console.error('Failed to update school settings', err);
      alert('Failed to update school settings');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put('/api/admin/notification-settings', notificationSettings);
      alert('Notification settings updated successfully!');
    } catch (err) {
      console.error('Failed to update notification settings', err);
      alert('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async (e) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      await axios.put('/api/admin/change-password', {
        current_password: securityForm.currentPassword,
        new_password: securityForm.newPassword
      });
      alert('Password changed successfully!');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to change password', err);
      alert(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileForm({ ...profileForm, avatar: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'school', label: 'School', icon: FiShield },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'security', label: 'Security', icon: FiLock },
  ];

  return (
    <div className="admin-dashboard-layout">
      <Sidebar activePage={activePage} />
      <main className="admin-main">
        <div style={{ padding: '28px 40px', background: '#f8f9fa', minHeight: '100vh' }}>
          
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>Settings</h1>
            <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage your school administration settings</p>
          </div>

          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: 6, 
            marginBottom: 24,
            background: '#f3f4f6',
            padding: '6px',
            borderRadius: 10,
            width: 'fit-content'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 7,
                  border: 'none',
                  background: activeTab === tab.id ? '#fff' : 'transparent',
                  color: activeTab === tab.id ? '#111827' : '#6b7280',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
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

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ 
              background: '#fff', 
              borderRadius: 12, 
              padding: '28px 32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              maxWidth: 820,
              border: '1px solid #f3f4f6'
            }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Admin Profile
              </h2>
              <p style={{ margin: '0 0 28px 0', fontSize: 13, color: '#9ca3af' }}>
                Update your personal information
              </p>

              <form onSubmit={handleProfileSave}>
                {/* Avatar Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ 
                    width: 90, 
                    height: 90, 
                    borderRadius: '50%', 
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 600,
                    color: '#6b7280',
                    overflow: 'hidden'
                  }}>
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      'AD'
                    )}
                  </div>
                  <div>
                    <label htmlFor="photo-upload">
                      <div style={{ 
                        padding: '9px 18px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb', 
                        background: '#fff',
                        color: '#374151',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        <FiCamera size={15} /> Change Photo
                      </div>
                    </label>
                    <input 
                      id="photo-upload"
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Form Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      First Name
                    </label>
                    <input 
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      placeholder="Admin"
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        borderRadius: 7, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      Last Name
                    </label>
                    <input 
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      placeholder="User"
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        borderRadius: 7, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      Email
                    </label>
                    <input 
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="admin@school.edu"
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        borderRadius: 7, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                      Phone
                    </label>
                    <input 
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      style={{ 
                        width: '100%', 
                        padding: '9px 12px', 
                        borderRadius: 7, 
                        border: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        fontSize: 14, 
                        outline: 'none',
                        color: '#111827'
                      }}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  style={{ 
                    padding: '10px 22px', 
                    borderRadius: 8, 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                    color: '#fff', 
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    opacity: loading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <FiSave size={15} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* School Tab */}
          {activeTab === 'school' && (
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: '32px 36px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              maxWidth: 900
            }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: '#111827' }}>
                School Information
              </h2>
              <p style={{ margin: '0 0 32px 0', fontSize: 14, color: '#6b7280' }}>
                Update your school details and contact information
              </p>

              <form onSubmit={handleSchoolSave}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    School Name
                  </label>
                  <input 
                    type="text"
                    value={schoolForm.schoolName}
                    onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                    placeholder="Springfield High School"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: 14, 
                      outline: 'none',
                      color: '#111827'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Address
                  </label>
                  <input 
                    type="text"
                    value={schoolForm.address}
                    onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                    placeholder="123 Main Street"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: 14, 
                      outline: 'none',
                      color: '#111827'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      City
                    </label>
                    <input 
                      type="text"
                      value={schoolForm.city}
                      onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                      placeholder="Springfield"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
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
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      State
                    </label>
                    <input 
                      type="text"
                      value={schoolForm.state}
                      onChange={(e) => setSchoolForm({ ...schoolForm, state: e.target.value })}
                      placeholder="IL"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
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
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Zip Code
                    </label>
                    <input 
                      type="text"
                      value={schoolForm.zipCode}
                      onChange={(e) => setSchoolForm({ ...schoolForm, zipCode: e.target.value })}
                      placeholder="62701"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
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

                <button 
                  type="submit"
                  disabled={loading}
                  style={{ 
                    padding: '12px 24px', 
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
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: '32px 36px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              maxWidth: 900
            }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: '#111827' }}>
                Notification Preferences
              </h2>
              <p style={{ margin: '0 0 32px 0', fontSize: 14, color: '#6b7280' }}>
                Manage how you receive notifications
              </p>

              <form onSubmit={handleNotificationSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
                    { key: 'studentEnrollment', label: 'Student Enrollment Alerts', description: 'Get notified when new students enroll' },
                    { key: 'courseUpdates', label: 'Course Update Notifications', description: 'Receive updates about course changes' },
                    { key: 'systemAlerts', label: 'System Alerts', description: 'Important system notifications and alerts' }
                  ].map(item => (
                    <div key={item.key} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '16px 20px',
                      background: '#f9fafb',
                      borderRadius: 10,
                      border: '1px solid #f3f4f6'
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {item.description}
                        </div>
                      </div>
                      <label style={{ 
                        position: 'relative', 
                        display: 'inline-block', 
                        width: 48, 
                        height: 26,
                        cursor: 'pointer'
                      }}>
                        <input 
                          type="checkbox"
                          checked={notificationSettings[item.key]}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{ 
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: notificationSettings[item.key] ? '#6366f1' : '#d1d5db',
                          transition: '0.3s',
                          borderRadius: 26,
                        }}>
                          <span style={{ 
                            position: 'absolute',
                            content: '',
                            height: 20,
                            width: 20,
                            left: notificationSettings[item.key] ? 25 : 3,
                            bottom: 3,
                            background: 'white',
                            transition: '0.3s',
                            borderRadius: '50%'
                          }}></span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{ 
                    padding: '12px 24px', 
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
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              padding: '32px 36px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              maxWidth: 900
            }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: '#111827' }}>
                Security Settings
              </h2>
              <p style={{ margin: '0 0 32px 0', fontSize: 14, color: '#6b7280' }}>
                Update your password and security preferences
              </p>

              <form onSubmit={handleSecuritySave}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Current Password
                  </label>
                  <input 
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: 14, 
                      outline: 'none',
                      color: '#111827'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    New Password
                  </label>
                  <input 
                    type="password"
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: 14, 
                      outline: 'none',
                      color: '#111827'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                    Confirm New Password
                  </label>
                  <input 
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8, 
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      fontSize: 14, 
                      outline: 'none',
                      color: '#111827'
                    }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{ 
                    padding: '12px 24px', 
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
                  <FiSave size={16} /> {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
