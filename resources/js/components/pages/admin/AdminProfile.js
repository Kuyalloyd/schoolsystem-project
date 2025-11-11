import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiMail, FiShield, FiLogOut, FiEdit2, FiSave, FiCamera, FiLock, FiPhone, FiBriefcase, FiMapPin, FiCalendar, FiClock, FiActivity, FiAward } from 'react-icons/fi';
import axios from 'axios';
import "../../../../sass/AdminDashboard.scss";

export default function AdminProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@fsuu.com',
    role: 'Administrator',
    profilePicture: null,
    phone: '+63 912 345 6789',
    department: 'Administration',
    location: 'Corner San Francisco Street and J.C. Aquino Avenue, Brgy. Sikatuna, Butuan City',
    joinDate: 'January 15, 2024',
  });
  const fileInputRef = useRef(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [manualSecret, setManualSecret] = useState('');

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await axios.get('/api/admin/profile');
      const data = response.data;
      
      setProfile({
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Admin User',
        email: data.email || 'admin@fsuu.com',
        role: 'Administrator',
        profilePicture: data.profile_picture || null,
        phone: data.phone || '+63 912 345 6789',
        department: 'Administration',
        location: 'Corner San Francisco Street and J.C. Aquino Avenue, Brgy. Sikatuna, Butuan City',
        joinDate: 'January 15, 2024',
      });
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    try {
      await axios.post("/logout", {}, { withCredentials: true });
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
      alert(err.response?.data?.message || "Logout failed. Please try again.");
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      // Read file and convert to base64 for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setProfile({ ...profile, profilePicture: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      formData.append('phone', profile.phone || '');
      formData.append('department', profile.department || '');
      formData.append('location', profile.location || '');
      formData.append('joinDate', profile.joinDate || '');
      
      // Add profile picture if there's a file
      if (fileInputRef.current && fileInputRef.current.files[0]) {
        formData.append('profile_picture', fileInputRef.current.files[0]);
      }
      
      // Send to backend
      const response = await axios.post('/api/admin/profile/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Refresh profile data to get the updated profile picture URL
      await fetchProfileData();
      
      setIsEditing(false);
      
      // Show a styled success message
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        font-weight: 600;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      `;
      successMessage.textContent = '✓ Profile updated successfully!';
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        successMessage.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => document.body.removeChild(successMessage), 300);
      }, 3000);
    } catch (err) {
      console.error('Profile update failed:', err);
      alert(err.response?.data?.message || 'Failed to update profile. Please try again.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      await axios.post('/api/admin/change-password', {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        new_password_confirmation: passwordForm.confirmPassword
      });

      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        font-weight: 600;
        z-index: 9999;
      `;
      successMessage.textContent = '✓ Password changed successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => document.body.removeChild(successMessage), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    }
  };

  const handleEnable2FA = async () => {
    try {
      // Generate 2FA secret and QR code
      const response = await axios.post('/api/admin/generate-2fa', {}, {
        withCredentials: true
      });
      console.log('2FA Response:', response.data);
      setQrCode(response.data.qrCodeUrl);
      setManualSecret(response.data.manualEntry || response.data.secret);
      setShow2FAModal(true);
    } catch (error) {
      console.error('Failed to generate 2FA:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to generate 2FA QR code: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleVerify2FA = async () => {
    try {
      const response = await axios.post('/api/admin/verify-2fa', {
        code: twoFACode
      });
      
      if (response.data.success) {
        alert('Two-Factor Authentication enabled successfully!');
        setShow2FAModal(false);
        setTwoFACode('');
      } else {
        alert('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
      alert('Invalid verification code');
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '100%', margin: '0 auto', background: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>My Profile</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#6b7280' }}>Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        {/* Avatar Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              background: profile.profilePicture ? `url(${profile.profilePicture}) center/cover` : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 36, 
              fontWeight: 700, 
              color: profile.profilePicture ? 'transparent' : '#fff',
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {!profile.profilePicture && 'AD'}
            </div>
            {isEditing && (
              <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                  id="profile-picture-upload"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                    transition: 'all 0.2s'
                  }}
                  title="Upload profile picture"
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <FiCamera size={18} />
                </button>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{profile.name}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>{profile.role}</p>
            {isEditing && profile.profilePicture && (
              <button
                onClick={handleRemoveProfilePicture}
                style={{
                  marginTop: 8,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #fee2e2',
                  background: '#fff',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                Remove Picture
              </button>
            )}
          </div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              style={{ 
                padding: '10px 20px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                background: '#fff', 
                color: '#374151', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <FiEdit2 size={16} /> Edit Profile
            </button>
          )}
        </div>

        {/* Profile Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              <FiUser size={14} style={{ display: 'inline', marginRight: 6 }} /> Full Name
            </label>
            {isEditing ? (
              <input 
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
              />
            ) : (
              <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{profile.name}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              <FiMail size={14} style={{ display: 'inline', marginRight: 6 }} /> Email Address
            </label>
            {isEditing ? (
              <input 
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
              />
            ) : (
              <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{profile.email}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              <FiShield size={14} style={{ display: 'inline', marginRight: 6 }} /> Role
            </label>
            <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{profile.role}</div>
          </div>

          {isEditing && (
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button 
                onClick={handleSave}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: 8, 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  color: '#fff', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8 
                }}
              >
                <FiSave size={16} /> Save Changes
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: 8, 
                  border: '1px solid #e5e7eb', 
                  background: '#fff', 
                  color: '#374151', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout for Additional Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Contact Information */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPhone size={20} /> Contact Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Phone Number</label>
              {isEditing ? (
                <input 
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
              ) : (
                <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{profile.phone}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Location</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
              ) : (
                <div style={{ fontSize: 15, color: '#111827', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiMapPin size={16} /> {profile.location}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiBriefcase size={20} /> Professional Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Department</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}
                />
              ) : (
                <div style={{ fontSize: 15, color: '#111827', fontWeight: 500 }}>{profile.department}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Join Date</label>
              <div style={{ fontSize: 15, color: '#111827', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiCalendar size={16} /> {profile.joinDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiLock size={20} /> Security Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Change Password</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Update your password regularly for better security</div>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 8, 
                border: '1px solid #e5e7eb', 
                background: '#fff', 
                color: '#374151', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              Change
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Add an extra layer of security to your account</div>
            </div>
            <button 
              onClick={handleEnable2FA}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 8, 
                border: 'none', 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                color: '#fff', 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}
            >
              Enable
            </button>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #fee2e2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#dc2626' }}>Logout</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' }}>Sign out of your account</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '10px 20px', 
              borderRadius: 8, 
              border: 'none', 
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', 
              color: '#fff', 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'}
          >
            <FiLogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
              Change Password
            </h2>
            
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b7280' }}>
                  Minimum 6 characters
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication Modal */}
      {show2FAModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
              Enable Two-Factor Authentication
            </h2>
            
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                background: '#f3f4f6',
                padding: 24,
                borderRadius: 12,
                marginBottom: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                {qrCode ? (
                  <>
                    <img 
                      src={qrCode} 
                      alt="QR Code" 
                      style={{ width: 200, height: 200, marginBottom: 12, border: '2px solid #e5e7eb', borderRadius: 8 }}
                      onError={(e) => {
                        console.error('QR Code failed to load:', qrCode);
                        e.target.style.display = 'none';
                      }}
                    />
                    <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#6b7280' }}>
                      Scan with Google Authenticator or Authy
                    </p>
                    {manualSecret && (
                      <div style={{ 
                        background: '#fff', 
                        padding: '12px 16px', 
                        borderRadius: 8, 
                        border: '1px solid #e5e7eb',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                          Can't scan? Enter this key manually:
                        </p>
                        <p style={{ 
                          margin: 0, 
                          fontSize: 14, 
                          fontFamily: 'monospace', 
                          color: '#1f2937',
                          wordBreak: 'break-all',
                          fontWeight: 600
                        }}>
                          {manualSecret}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ 
                      width: 200, 
                      height: 200, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '2px dashed #d1d5db',
                      borderRadius: 8,
                      marginBottom: 12
                    }}>
                      <p style={{ margin: 0, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                        Loading QR Code...
                      </p>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#9ca3af' }}>
                      Please wait
                    </p>
                  </>
                )}
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  Enter 6-digit verification code:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px solid #3b82f6',
                    borderRadius: 8,
                    fontSize: 24,
                    fontWeight: 700,
                    textAlign: 'center',
                    letterSpacing: '0.5em',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFACode('');
                  setQrCode('');
                  setManualSecret('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerify2FA}
                disabled={twoFACode.length !== 6}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: twoFACode.length === 6 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#d1d5db',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: twoFACode.length === 6 ? 'pointer' : 'not-allowed',
                  opacity: twoFACode.length === 6 ? 1 : 0.6
                }}
              >
                Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
