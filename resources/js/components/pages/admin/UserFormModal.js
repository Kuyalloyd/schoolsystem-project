import React, { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { FiX, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiBook, FiAward } from 'react-icons/fi';

export default function UserFormModal({ initial, onClose, onSave, role = 'student', bare = false }) {
  const [form, setForm] = useState({
    name: "",
    student_id: "",
    date_of_birth: "",
    enrollment_date: "",
    email: "",
    phone_number: "",
    major: "",
    academic_year: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
    status: "Active",
    role: role || 'student',
    sex: '',
    password: '',
    // teacher fields
    faculty_id: '',
    position: '',
    department: '',
    courses_handled: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const watchdogRef = React.useRef(null);

  // Ensure the internal form.role always reflects the `role` prop passed by the
  // parent. Some callers render this modal for 'teacher' and expect the form to
  // initialize with that role; if the prop changes we should keep the form in
  // sync so the conditional fields and submit payload are correct.
  useEffect(() => {
    setForm(f => ({ ...f, role: role || f.role || 'student' }));
  }, [role]);

  useEffect(() => {
    if (initial) {
      setForm((f) => ({
        ...f,
        name: initial.name || (initial.first_name ? `${initial.first_name} ${initial.last_name || ''}`.trim() : ''),
        student_id: initial.student?.student_id || initial.student_id || '',
  date_of_birth: initial.date_of_birth || initial.student?.date_of_birth || '',
  enrollment_date: initial.student?.enrollment_date || initial.enrollment_date || '',
        email: initial.email || '',
        phone_number: initial.phone_number || initial.student?.phone_number || '',
        major: initial.student?.course || '',
        academic_year: initial.student?.year_level || '',
        address: initial.student?.address || '',
        emergency_contact: initial.student?.emergency_contact || '',
        emergency_phone: initial.student?.emergency_phone || '',
  status: initial.student?.status || initial.status || 'Active',
  faculty_id: initial.teacher?.teacher_id || initial.teacher?.faculty_id || initial.faculty_id || '',
        position: initial.teacher?.position || initial.position || '',
  department: initial.student?.department || initial.teacher?.department || initial.department || '',
        courses_handled: Array.isArray(initial.teacher?.courses_handled) ? initial.teacher.courses_handled.join(', ') : (initial.teacher?.courses_handled || ''),
        role: initial.role || f.role || role || 'student',
        // optionally set sex if provided on profile
        sex: initial.student?.sex || initial.teacher?.sex || initial.sex || f.sex || '',
      }));
    }
  }, [initial]);

  useEffect(() => {
    // set a minimal global flag so parent can detect mount if needed
    try {
      if (typeof window !== 'undefined') {
        window.__adminUserModalMounted = true;
        window.__adminUserModalRole = role;
        try { console.debug('[UserFormModal] mounted for role', role); } catch(e){}
      }
    } catch(e){}
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.__adminUserModalMounted = false;
          try { console.debug('[UserFormModal] unmounted for role', role); } catch(e){}
        }
      } catch(e){}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: removed on-page push of debug messages to avoid showing any badge or 'unmounted' text.

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = (e) => {
    e.preventDefault();
    // minimal client-side validation
    const err = {};
    if (!form.name || !form.name.trim()) err.name = 'Full name is required';
    // student fields are optional on the client; backend will generate or validate as needed
    if (!form.email || !form.email.trim()) err.email = 'Email is required';
    // simple email pattern
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Enter a valid email';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    setSubmitMessage('');
    // watchdog: if request takes too long, reset UI and inform the user
    try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_){}
    watchdogRef.current = setTimeout(() => {
      try { setSubmitting(false); } catch(_e){}
      try { setSubmitMessage('Taking longer than expected. Please check your connection or try again.'); } catch(_e){}
    }, 15000);
    // assemble payload matching ERD fields
    const roleVal = form.role || role || 'student';

    // split name into first_name / last_name for backend compatibility
    const parts = (form.name || '').trim().split(/\s+/);
    const first_name = parts.length ? parts[0] : '';
    const last_name = parts.length > 1 ? parts.slice(1).join(' ') : '';

    const base = {
      name: form.name,
      first_name,
      last_name,
      email: form.email,
      role: roleVal,
    };

    // include password only when creating a new user
    // password handling removed — creation doesn't require a password from the admin UI

    if (roleVal === 'teacher') {
      const payload = {
        ...base,
        faculty_id: form.faculty_id,
        teacher_id: form.teacher_id || form.faculty_id || undefined,
        first_name,
        last_name,
        sex: form.sex,
        email: form.email,
        date_of_birth: form.date_of_birth,
        phone_number: form.phone_number,
        address: form.address,
        course: form.major || form.course || '',
        department: form.department,
        status: form.status,
        courses_handled: form.courses_handled,
        position: form.position,
      };
      if (initial && initial.id) payload.id = initial.id;
      // include password for new user creation
      if (!(initial && initial.id)) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
        // strip empty values so the server doesn't receive blank strings that overwrite required columns
        const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));
        Promise.resolve(onSave(payloadFiltered, !!initial)).then((res) => {
        // on success, clear errors and close immediately
        try { setErrors({}); } catch(e){}
  try { onClose && onClose('save-success'); } catch(e){}
      }).catch((err) => {
        // if the caller attached field errors, surface them inline
        if (err && err.fields && typeof err.fields === 'object') {
          setErrors(err.fields);
          return;
        }
        // show server response for debugging
        try {
          if (err && err.response) {
            const s = err.response.status;
            const d = err.response.data;
            console.warn('UserFormModal save error', s, d);
            alert('Save failed: ' + (d && (d.message || JSON.stringify(d)) || s));
            if (d && d.errors) setErrors(Object.keys(d.errors).reduce((acc,k)=> ({ ...acc, [k]: d.errors[k].join(' ') }), {}));
            return;
          }
        } catch(e) { console.error('error showing save error', e); }
        if (err && err.message) { alert(err.message); return; }
        alert('Failed to save user');
      }).finally(() => { try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_e){} try { setSubmitting(false); } catch(_e){} });
      return;
    }

    // student payload (map major -> course, academic_year -> year_level)
    const payload = {
      ...base,
      student_id: form.student_id,
      first_name,
      last_name,
      date_of_birth: form.date_of_birth,
      date_of_enrollment: form.enrollment_date,
      phone_number: form.phone_number,
      course: form.major,
      year_level: form.academic_year,
      address: form.address,
      emergency_contact: form.emergency_contact,
      emergency_phone: form.emergency_phone,
      sex: form.sex,
      department: form.department,
      status: form.status,
    };
  if (initial && initial.id) payload.id = initial.id;
  if (!(initial && initial.id)) payload.password = (Math.random().toString(36).slice(-8) + 'A1!');
  const payloadFiltered = Object.fromEntries(Object.entries(payload).filter(([k,v]) => v !== '' && v !== null && typeof v !== 'undefined'));
  Promise.resolve(onSave(payloadFiltered, !!initial)).then((res) => {
    try { setErrors({}); } catch(e){}
  try { onClose && onClose('save-success'); } catch(e){}
  }).catch((err) => {
    if (err && err.fields && typeof err.fields === 'object') {
      setErrors(err.fields);
      return;
    }
    if (err && err.message) {
      alert(err.message);
      return;
    }
    alert('Failed to save user');
  }).finally(() => { try { if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; } } catch(_e){} try { setSubmitting(false); } catch(_e){} });
  };
  // build role-specific fragments to keep the JSX (createElement) tree simple and parser-friendly
  const studentTopLeft = React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Student ID'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiAward, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'student_id', value: form.student_id, onChange: handleChange, placeholder: 'ST2024001' })
      ),
      errors.student_id ? React.createElement('div', { className: 'input-error' }, errors.student_id) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Email *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMail, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'student@school.edu' })
      ),
      errors.email ? React.createElement('div', { className: 'input-error' }, errors.email) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Major *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiBook, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'major', value: form.major, onChange: handleChange, placeholder: 'Select major' })
      ),
      errors.major ? React.createElement('div', { className: 'input-error' }, errors.major) : null
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Phone *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'phone_number', value: form.phone_number, onChange: handleChange, placeholder: '(555) 123-4567' })
      )
    )
  );

  const teacherTopLeft = React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Faculty ID'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiAward, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'faculty_id', value: form.faculty_id, onChange: handleChange, placeholder: 'FAC2024001' })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Email *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMail, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'email', type: 'email', value: form.email, onChange: handleChange, placeholder: 'teacher@school.edu' })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Position'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiBook, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'position', value: form.position, onChange: handleChange, placeholder: 'Professor / Lecturer' })
      )
    ),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Phone *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'phone_number', value: form.phone_number, onChange: handleChange, placeholder: '(555) 123-4567' })
      )
    )
  );

  const topLeft = React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Full Name *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiUser, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'name', value: form.name, onChange: handleChange, placeholder: 'John Doe', required: true })
      )
    ),
    (form.role === 'student' ? studentTopLeft : teacherTopLeft)
  );

  const topRight = React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Date of Birth *'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'date_of_birth', type: 'date', value: form.date_of_birth, onChange: handleChange })
      )
    ),
    // Sex field for both students and teachers
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Sex'),
      React.createElement('select', { name: 'sex', value: form.sex, onChange: handleChange, className: 'select-modern' },
        React.createElement('option', { value: '' }, 'Prefer not to say'),
        React.createElement('option', { value: 'Male' }, 'Male'),
        React.createElement('option', { value: 'Female' }, 'Female'),
        React.createElement('option', { value: 'Other' }, 'Other')
      )
    ),
    // Enrollment Date for students only
    (role === 'student' ? React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Enrollment Date'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiCalendar, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'enrollment_date', type: 'date', value: form.enrollment_date, onChange: handleChange })
      )
    ) : null),
    React.createElement('div', { className: 'form-group-modern' },
      (form.role === 'student' ? React.createElement('label', null, 'Academic Year') : React.createElement('label', null, 'Department')),
      (form.role === 'student'
        ? React.createElement('select', { name: 'academic_year', value: form.academic_year, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: '' }, 'Select year'), 
          React.createElement('option', { value: 'Freshman' }, 'Freshman'), 
          React.createElement('option', { value: 'Sophomore' }, 'Sophomore'), 
          React.createElement('option', { value: 'Junior' }, 'Junior'), 
          React.createElement('option', { value: 'Senior' }, 'Senior')
        )
        : React.createElement('div', { className: 'input-with-icon' },
          React.createElement(FiBook, { className: 'input-icon', size: 18 }),
          React.createElement('input', { name: 'department', value: form.department, onChange: handleChange, placeholder: 'Enter department' })
        )
      )
    )
  );

  const middleLeftStudent = React.createElement('div', { className: 'form-group-modern' },
    React.createElement('label', null, 'Emergency Contact'),
    React.createElement('div', { className: 'input-with-icon' },
      React.createElement(FiUser, { className: 'input-icon', size: 18 }),
      React.createElement('input', { name: 'emergency_contact', value: form.emergency_contact, onChange: handleChange, placeholder: 'Name (Relationship)' })
    )
  );

  const middleLeftTeacher = React.createElement('div', { className: 'form-group-modern' },
    React.createElement('label', null, 'Courses Handled (comma separated)'),
    React.createElement('div', { className: 'input-with-icon' },
      React.createElement(FiBook, { className: 'input-icon', size: 18 }),
      React.createElement('input', { name: 'courses_handled', value: form.courses_handled, onChange: handleChange, placeholder: 'Course A, Course B' })
    )
  );

  const middleLeft = React.createElement('div', { className: 'col-modern' },
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Address'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiMapPin, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'address', value: form.address, onChange: handleChange, placeholder: '123 Main St, City, State ZIP' })
      )
    ),
    (form.role === 'student' ? middleLeftStudent : middleLeftTeacher)
  );

  // no live preview — removed per request

  const middleRight = React.createElement('div', { className: 'col-modern' },
    (form.role === 'student' ? React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Emergency Phone'),
      React.createElement('div', { className: 'input-with-icon' },
        React.createElement(FiPhone, { className: 'input-icon', size: 18 }),
        React.createElement('input', { name: 'emergency_phone', value: form.emergency_phone, onChange: handleChange, placeholder: '(555) 000-0000' })
      )
    ) : null),
    React.createElement('div', { className: 'form-group-modern' },
      React.createElement('label', null, 'Status *'),
      (form.role === 'student'
        ? React.createElement('select', { name: 'status', value: form.status, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: 'Active' }, 'Active'), 
          React.createElement('option', { value: 'Suspended' }, 'Suspended'), 
          React.createElement('option', { value: 'Graduated' }, 'Graduated'), 
          React.createElement('option', { value: 'Locked' }, 'Locked')
        )
        : React.createElement('select', { name: 'status', value: form.status, onChange: handleChange, className: 'select-modern' }, 
          React.createElement('option', { value: 'Active' }, 'Active'), 
          React.createElement('option', { value: 'Sabbatical' }, 'Sabbatical'), 
          React.createElement('option', { value: 'Retired' }, 'Retired'), 
          React.createElement('option', { value: 'Locked' }, 'Locked')
        )
      )
    )
  );

  const isTeacher = (form.role || role) === 'teacher';

  const modalInner = React.createElement(
    'div',
    { className: 'modal modal-wide modal-modern', 'data-admin-user-modal': '1', style: { maxWidth: '960px', width: '100%', boxSizing: 'border-box', margin: '0 auto', position: 'relative' } },
    React.createElement(
      'header',
      { className: 'modal-header-modern' },
      React.createElement('div', { className: 'modal-header-content' },
        React.createElement('div', { className: 'modal-icon' },
          React.createElement(FiUser, { size: 24 })
        ),
        React.createElement('div', null,
          React.createElement('h3', null, initial ? (isTeacher ? 'Edit Teacher' : 'Edit Student') : (isTeacher ? 'Add New Teacher' : 'Add New Student')),
          React.createElement('p', { className: 'modal-subtitle' }, 
            initial ? 'Update the information below' : 'Fill in the information to create a new ' + (isTeacher ? 'teacher' : 'student')
          )
        )
      ),
      React.createElement('button', { className: 'modal-close-btn', onClick: onClose, type: 'button' },
        React.createElement(FiX, { size: 20 })
      )
    ),
    React.createElement(
      'form',
      { onSubmit: submit, className: 'modal-body-modern' },
      React.createElement('div', { className: 'modal-grid-modern' }, topLeft, topRight),
      React.createElement('div', { className: 'modal-grid-modern full' }, middleLeft, middleRight),
      (submitMessage ? React.createElement('div', { className: 'submit-message', style: { marginTop: 8, color: '#92400e', background: '#fff7ed', border: '1px solid #fed7aa', padding: 10, borderRadius: 8 } }, submitMessage) : null),
      React.createElement(
        'footer',
        { className: 'modal-footer-modern' },
        React.createElement('button', { type: 'button', className: 'btn-cancel-modern', onClick: onClose, disabled: submitting }, 'Cancel'),
        React.createElement('button', { type: 'submit', className: 'btn-save-modern', disabled: submitting }, 
          submitting ? (
            React.createElement('span', null, 
              React.createElement('span', { className: 'spinner-modern' }),
              'Saving...'
            )
          ) : (initial ? 'Save Changes' : (isTeacher ? 'Add Teacher' : 'Add Student'))
        )
      )
    )
  );

  // When bare=true, return the inner modal content only. Parent is responsible for overlay.
  if (bare) return modalInner;

  // Render into a top-level portal so this modal is never hidden behind other overlays
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      let root = document.getElementById('admin-modal-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'admin-modal-root';
        // keep the root simple; z-index is applied on the overlay element below
        document.body.appendChild(root);
      }
      const overlay = React.createElement(
        'div',
        { 
          className: 'modal-overlay', 
          style: { zIndex: 10000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          onMouseDown: (e) => {
            // Only close on mouseDown if clicking directly on backdrop (not modal content)
            // Use mouseDown instead of onClick to prevent bubbling issues
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
              onClose && onClose('backdrop-click');
            }
          },
          onClick: (e) => {
            // Prevent any click events from bubbling
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
        // ensure the modal is scrollable on small viewports and centered
        React.cloneElement(modalInner, { 
          style: Object.assign({}, modalInner.props && modalInner.props.style || {}, { maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', alignSelf: 'center', position: 'relative', left: 'initial', transform: 'none' }),
          onClick: (e) => e.stopPropagation() // prevent clicks inside modal from bubbling to overlay
        })
      );
      return createPortal(overlay, root);
    }
  } catch (e) { /* fall through to inline */ }

  return React.createElement('div', { className: 'modal-overlay', style: { zIndex: 10000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' } }, React.cloneElement(modalInner, { style: Object.assign({}, modalInner.props && modalInner.props.style || {}, { maxHeight: '90vh', overflowY: 'auto', margin: '0 auto', alignSelf: 'center', position: 'relative', left: 'initial', transform: 'none' }) }));
}
