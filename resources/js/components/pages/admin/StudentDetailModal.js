import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentDetailModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ ...user });
  }, [user]);

  if (!user) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { status: form.status };
      // include other editable fields if needed
      const res = await axios.put(`/api/admin/users/${user.id}`, payload);
      if (typeof onSaved === 'function') onSaved(res.data || { ...form });
      onClose();
      alert('Student updated');
    } catch (err) {
      console.error('Save student error', err);
      alert('Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'modal' },
      React.createElement(
        'header',
        { className: 'modal-header' },
        React.createElement('h3', null, 'Student Details'),
        React.createElement('button', { className: 'close', onClick: onClose }, '×')
      ),
      React.createElement(
        'div',
        { className: 'modal-body' },
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
          React.createElement('div', null, React.createElement('strong', null, 'Student ID'), React.createElement('div', null, form.student_id || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Full Name'), React.createElement('div', null, form.name || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Email'), React.createElement('div', null, form.email || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Phone'), React.createElement('div', null, form.phone || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Major'), React.createElement('div', null, form.major || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Year'), React.createElement('div', null, form.year || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'GPA'), React.createElement('div', null, form.gpa || '—')),
          React.createElement('div', null, React.createElement('strong', null, 'Enrolled Courses'), React.createElement('div', null, form.enrolled_count || 0))
        ),

        React.createElement('div', { style: { marginTop: '12px' } },
          React.createElement('label', null, 'Change Status'),
          React.createElement('select', { name: 'status', value: form.status || 'Active', onChange: handleChange },
            React.createElement('option', { value: 'Active' }, 'Active'),
            React.createElement('option', { value: 'Inactive' }, 'Inactive'),
            React.createElement('option', { value: 'Graduated' }, 'Graduated'),
            React.createElement('option', { value: 'Suspended' }, 'Suspended')
          )
        )
      ),
      React.createElement(
        'footer',
        { className: 'modal-footer' },
        React.createElement('button', { onClick: onClose, style: { marginRight: '8px' } }, 'Close'),
        React.createElement('button', { onClick: save, disabled: saving }, saving ? 'Saving…' : 'Save Changes')
      )
    )
  );
}
