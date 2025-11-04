import React, { useState } from 'react';
import { FiCalendar, FiClock, FiX } from 'react-icons/fi';

export default function EventFormModal({ visible, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    if (onSave) await onSave(form);
    setSubmitting(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" style={{ 
        maxWidth: 420, 
        padding: 0, 
        borderRadius: 16, 
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        background: '#fff',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute',
            top: 16, 
            right: 16, 
            width: 36, 
            height: 36, 
            borderRadius: 8,
            border: 'none',
            background: 'rgba(0,0,0,0.05)',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fee2e2';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <FiX size={20} />
        </button>

        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
          padding: '24px 28px',
          color: '#fff'
        }}>
          <h2 style={{ 
            fontSize: 20, 
            margin: 0, 
            fontWeight: 700,
            letterSpacing: '-0.3px'
          }}>Add New Event</h2>
          <p style={{ 
            margin: '4px 0 0 0', 
            fontSize: 13, 
            opacity: 0.9,
            fontWeight: 400
          }}>Create a new event for the school calendar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          <div className="form-group-modern" style={{ marginBottom: 18 }}>
            <label style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151',
              marginBottom: 6,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Event Title</label>
            <input 
              name="title" 
              value={form.title} 
              onChange={handleChange} 
              placeholder="Enter event title" 
              required 
              style={{ 
                fontSize: 14, 
                padding: '12px 14px', 
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                width: '100%',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontWeight: 500
              }} 
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div className="form-group-modern" style={{ marginBottom: 18 }}>
            <label style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151',
              marginBottom: 6,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Date</label>
            <div style={{ position: 'relative' }}>
              <FiCalendar style={{ 
                position: 'absolute', 
                left: 14, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none'
              }} size={18} />
              <input 
                type="date" 
                name="date" 
                value={form.date} 
                onChange={handleChange} 
                required 
                style={{ 
                  fontSize: 14, 
                  padding: '12px 14px 12px 44px', 
                  borderRadius: 10,
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }} 
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          <div className="form-group-modern" style={{ marginBottom: 24 }}>
            <label style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: '#374151',
              marginBottom: 6,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Time</label>
            <div style={{ position: 'relative' }}>
              <FiClock style={{ 
                position: 'absolute', 
                left: 14, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none'
              }} size={18} />
              <input 
                type="time" 
                name="time" 
                value={form.time} 
                onChange={handleChange} 
                required 
                style={{ 
                  fontSize: 14, 
                  padding: '12px 14px 12px 44px', 
                  borderRadius: 10,
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }} 
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            style={{ 
              width: '100%',
              padding: '14px 0', 
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(30,64,175,0.25)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,64,175,0.35)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(30,64,175,0.25)';
            }}
          >
            {submitting ? 'Saving...' : 'Add Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
