import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserDetailModal({ user, type = 'student', onClose, onSaved }) {
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
      const payload = { ...form };
      const res = await axios.put(`/api/admin/users/${user.id}`, payload);
      if (typeof onSaved === 'function') onSaved(res.data || payload);
      onClose();
      alert(`${type === 'teacher' ? 'Teacher' : 'Student'} updated`);
    } catch (err) {
      console.error('Save user error', err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return React.createElement(
    'div',
    { className: 'modal-backdrop' },
    React.createElement(
      'div',
      { className: 'modal modal-wide' },
      React.createElement(
        'header',
        { className: 'modal-header' },
        React.createElement('h3', null, type === 'teacher' ? 'Teacher Details' : 'Student Information'),
        React.createElement('button', { className: 'close', onClick: onClose }, '×')
      ),
      React.createElement(
        'div',
        { className: 'modal-body' },
        // Teacher view
        type === 'teacher' ? React.createElement('div', null,
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
            React.createElement('div', null,
              React.createElement('strong', null, 'Faculty ID'), React.createElement('div', null, form.teacher?.faculty_id || form.faculty_id || form.id || '—'),
              React.createElement('strong', null, 'First Name'), React.createElement('div', null, form.first_name || (form.name || '').split(' ')[0] || '—'),
              React.createElement('strong', null, 'Sex'), React.createElement('div', null, form.teacher?.sex || form.sex || '—'),
              React.createElement('strong', null, 'Address'), React.createElement('div', null, form.teacher?.address || form.address || '—'),
              React.createElement('strong', null, 'Department'), React.createElement('div', null, form.teacher?.department || form.department || '—')
            ),
            React.createElement('div', null,
              React.createElement('strong', null, 'Last Name'), React.createElement('div', null, form.last_name || ((form.name || '').split(' ').slice(1).join(' ')) || '—'),
              React.createElement('strong', null, 'Email'), React.createElement('div', null, form.email || '—'),
              React.createElement('strong', null, 'Date of Birth'), React.createElement('div', null, form.teacher?.date_of_birth || form.date_of_birth || '—'),
              React.createElement('strong', null, 'Course / Specialization'), React.createElement('div', null, form.teacher?.course || form.teacher?.specialization || form.course || '—')
            )
          ),

          React.createElement('div', { style: { marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } },
            React.createElement('div', null, React.createElement('strong', null, 'Phone Number'), React.createElement('div', null, form.teacher?.phone_number || form.phone_number || '—')),
            React.createElement('div', null, React.createElement('strong', null, 'Position'), React.createElement('div', null, form.teacher?.position || form.position || '—')),
            React.createElement('div', null, React.createElement('strong', null, 'Status'), React.createElement('div', null, form.teacher?.status || form.status || '—'))
          ),

          React.createElement('div', { style: { marginTop: 12 } },
            React.createElement('strong', null, 'Courses Handled'), React.createElement('div', null, Array.isArray(form.teacher?.courses_handled) ? (form.teacher.courses_handled.join(', ')) : (form.teacher?.courses_handled || '—'))
          )
        ) : (
          // Student layout (unchanged)
          React.createElement('div', null,
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
              React.createElement('div', null,
                React.createElement('strong', null, 'Student ID'), React.createElement('div', null, form.student?.student_id || form.student_id || form.id || '—'),
                React.createElement('strong', null, 'First Name'), React.createElement('div', null, form.first_name || (form.name || '').split(' ')[0] || '—'),
                React.createElement('strong', null, 'Sex'), React.createElement('div', null, form.student?.sex || form.sex || '—'),
                React.createElement('strong', null, 'Address'), React.createElement('div', null, form.student?.address || form.address || '—'),
                React.createElement('strong', null, 'Department'), React.createElement('div', null, form.student?.department || form.department || '—')
              ),
              React.createElement('div', null,
                React.createElement('strong', null, 'Last Name'), React.createElement('div', null, form.last_name || ((form.name || '').split(' ').slice(1).join(' ')) || '—'),
                React.createElement('strong', null, 'Email'), React.createElement('div', null, form.email || '—'),
                React.createElement('strong', null, 'Date of Birth'), React.createElement('div', null, form.student?.date_of_birth || form.date_of_birth || '—'),
                React.createElement('strong', null, 'Course'), React.createElement('div', null, form.student?.course || form.student?.major || form.course || '—')
              )
            ),

            React.createElement('div', { style: { marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } },
              React.createElement('div', null, React.createElement('strong', null, 'Phone Number'), React.createElement('div', null, form.student?.phone_number || form.phone_number || '—')),
              React.createElement('div', null, React.createElement('strong', null, 'Year Level'), React.createElement('div', null, form.student?.year_level || form.academic_year || '—')),
              React.createElement('div', null, React.createElement('strong', null, 'Status'), React.createElement('div', null, form.student?.status || form.status || '—'))
            )
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
