import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentDetailModal({ user, onClose }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (user) setForm({ ...user });
  }, [user]);

  if (!user) return null;

  const student = form.student || {};
  const fullName = form.name || `${(student.first_name || '').trim()} ${(student.last_name || '').trim()}`.trim() || '—';
  const studentId = form.student_id || student.student_id || form.id || '—';
  const email = form.email || student.email || '—';
  const phone = form.phone || student.phone_number || student.phone || '—';
  const major = form.major || student.major || student.course || '—';
  const year = form.year || student.year_level || student.academic_year || '—';
  const gpa = (form.gpa || student.gpa) ? String(form.gpa || student.gpa) : '—';
  const enrolled = form.enrolled_count || student.enrolled_count || 0;

  return React.createElement(
    'div',
    { className: 'modal-backdrop modal-centered' },
    React.createElement(
      'div',
      { className: 'modal modal-card with-shadow' },
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
          React.createElement('div', null, React.createElement('strong', null, 'Student ID'), React.createElement('div', null, studentId)),
          React.createElement('div', null, React.createElement('strong', null, 'Full Name'), React.createElement('div', null, fullName)),
          React.createElement('div', null, React.createElement('strong', null, 'Email'), React.createElement('div', null, email)),
          React.createElement('div', null, React.createElement('strong', null, 'Phone'), React.createElement('div', null, phone)),
          React.createElement('div', null, React.createElement('strong', null, 'Major'), React.createElement('div', null, major)),
          React.createElement('div', null, React.createElement('strong', null, 'Year'), React.createElement('div', null, year)),
          React.createElement('div', null, React.createElement('strong', null, 'GPA'), React.createElement('div', null, gpa)),
          React.createElement('div', null, React.createElement('strong', null, 'Enrolled Courses'), React.createElement('div', null, enrolled))
        )
      ),
      React.createElement(
        'footer',
        { className: 'modal-footer' },
        React.createElement('button', { type: 'button', onClick: onClose }, 'Close')
      )
    )
  );
}
